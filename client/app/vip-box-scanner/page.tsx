"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { getApiUrl } from "@/config";

interface Guest { passRef: string; guestName: string; homeBox: number; currentBox: number | null; present: boolean; isWalkIn: boolean; }
interface Box { number: number; capacity: number; fixed: boolean; occupants: Guest[]; }
interface Snapshot { matchLabel: string; boxes: Box[]; guests: Guest[]; }

export default function VipConsolePage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const [data, setData] = useState<Snapshot | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBox, setNewBox] = useState<number | "">("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  useEffect(() => { setToken(localStorage.getItem("vipbox_scanner_token")); }, []);

  async function login() {
    setLoginErr(null);
    try {
      const res = await fetch(getApiUrl("scanner/login"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const json = await res.json();
      if (res.ok && json?.success && json.data?.token) { localStorage.setItem("vipbox_scanner_token", json.data.token); setToken(json.data.token); }
      else setLoginErr(json?.message || "Login failed.");
    } catch { setLoginErr("Login failed."); }
  }

  const open = useCallback(async (payload: { token?: string; qr?: string }) => {
    if (busyRef.current) return; busyRef.current = true; setErr(null);
    try {
      const res = await fetch(getApiUrl("vip-box/console"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.status === 401) { localStorage.removeItem("vipbox_scanner_token"); setToken(null); return; }
      const json = await res.json();
      if (json?.success) { setData(json.data); stopCamera(); } else setErr(json?.message || "Invalid code.");
    } catch { setErr("Could not open console."); }
    finally { setTimeout(() => (busyRef.current = false), 700); }
  }, [token]);

  async function act(path: string, body: any, okMsg?: string) {
    setErr(null); setMsg(null);
    try {
      const res = await fetch(getApiUrl(`vip-box/${path}`), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const json = await res.json();
      if (res.ok && json?.success) { setData(json.data); if (okMsg) setMsg(okMsg); }
      else setErr(json?.message || "Action failed.");
    } catch { setErr("Action failed."); }
  }

  const tick = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data) { void open({ qr: code.data }); return; }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [open]);

  async function startCamera() {
    setErr(null);
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setScanning(true); rafRef.current = requestAnimationFrame(tick); } }
    catch { setErr("Could not access camera. Use manual code."); }
  }
  function stopCamera() { if (rafRef.current) cancelAnimationFrame(rafRef.current); const v = videoRef.current; if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop()); setScanning(false); }
  useEffect(() => () => stopCamera(), []);

  const boxFull = (b: Box, g: Guest) => b.occupants.filter((o) => o.passRef !== g.passRef).length >= b.capacity;

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold">VIP Box Console</h1>
          <p className="text-white/50 text-sm mt-1">Sign in with your scanner account.</p>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full mt-4 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full mt-3 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
          {loginErr && <p className="text-red-400 text-sm mt-2">{loginErr}</p>}
          <button onClick={login} className="w-full mt-4 rounded-xl bg-amber-500 text-black py-2.5 font-semibold">Sign in</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">VIP Box Console</h1>
            <button onClick={() => { localStorage.removeItem("vipbox_scanner_token"); setToken(null); }} className="text-xs text-white/50 underline">Sign out</button>
          </div>
          <p className="text-white/60 text-sm mt-1">Scan the VIP master QR to open the guest list.</p>
          <div className="mt-4 rounded-2xl border border-white/15 bg-black/30 overflow-hidden">
            <video ref={videoRef} className="w-full aspect-square object-cover bg-black" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-3">
              {!scanning ? <button onClick={startCamera} className="w-full rounded-xl bg-amber-500 text-black py-2.5 font-semibold">Start camera</button>
                : <button onClick={stopCamera} className="w-full rounded-xl border border-white/20 py-2.5 font-semibold">Stop camera</button>}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="NUSCVIP-… (manual code)" className="flex-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
            <button onClick={() => manual.trim() && open({ token: manual.trim() })} className="px-4 rounded-lg bg-amber-500 text-black font-semibold">Open</button>
          </div>
          {err && <p className="mt-4 text-red-400">{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{data.matchLabel} — Boxes</h1>
          <button onClick={() => setData(null)} className="text-xs text-white/50 underline">Rescan</button>
        </div>
        {err && <p className="mt-3 text-red-400">{err}</p>}
        {msg && <p className="mt-3 text-emerald-400">{msg}</p>}

        {/* Box summary */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.boxes.map((b) => (
            <div key={b.number} className={`rounded-xl border p-2 ${b.occupants.length >= b.capacity ? "border-red-500/40 bg-red-500/5" : "border-white/15 bg-white/5"}`}>
              <div className="flex justify-between"><span className="font-bold">Box {b.number}</span><span className="text-xs text-white/50">{b.occupants.length}/{b.capacity}{b.fixed ? " · fixed" : ""}</span></div>
              <div className="text-[11px] text-white/60 mt-1 min-h-[14px]">{b.occupants.map((o) => o.guestName).join(", ")}</div>
            </div>
          ))}
        </div>

        {/* Add walk-in */}
        <div className="mt-5 rounded-xl border border-white/15 p-3">
          <div className="text-sm font-semibold mb-2">+ Add guest (walk-in)</div>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Guest name" className="flex-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
            <select value={newBox} onChange={(e) => setNewBox(e.target.value ? Number(e.target.value) : "")} className="rounded-lg bg-black/40 border border-white/20 px-2 py-2 text-sm">
              <option value="">Box…</option>
              {data.boxes.map((b) => <option key={b.number} value={b.number} disabled={b.occupants.length >= b.capacity}>Box {b.number} ({b.occupants.length}/{b.capacity})</option>)}
            </select>
            <button onClick={() => { if (newName.trim() && newBox) { act("add-guest", { name: newName.trim(), toBox: newBox }, "Guest added"); setNewName(""); setNewBox(""); } }} className="px-4 rounded-lg bg-amber-500 text-black font-semibold">Add</button>
          </div>
        </div>

        {/* Guest roster */}
        <div className="mt-5 space-y-2">
          {data.guests.map((g) => (
            <div key={g.passRef} className="rounded-xl border border-white/15 bg-white/5 p-3 flex items-center gap-2">
              <div className="flex-1">
                <div className="font-semibold">{g.guestName}{g.isWalkIn ? <span className="text-[10px] text-amber-400 ml-1">walk-in</span> : ""}</div>
                <div className="text-[11px] text-white/50">home box {g.homeBox} · {g.present && g.currentBox ? `in Box ${g.currentBox}` : "not arrived"}</div>
              </div>
              <select value={g.present && g.currentBox ? String(g.currentBox) : ""}
                onChange={(e) => act("assign", { passRef: g.passRef, toBox: e.target.value ? Number(e.target.value) : null, present: !!e.target.value })}
                className="rounded-lg bg-black/40 border border-white/20 px-2 py-2 text-sm">
                <option value="">Not arrived</option>
                {data.boxes.map((b) => <option key={b.number} value={b.number} disabled={boxFull(b, g)}>Box {b.number} ({b.occupants.length}/{b.capacity})</option>)}
              </select>
              <button onClick={() => act("remove-guest", { passRef: g.passRef }, "Removed")} className="w-8 h-8 rounded-lg border border-white/20 text-white/50" title="Remove / unseat">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
