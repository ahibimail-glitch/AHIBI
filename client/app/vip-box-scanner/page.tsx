"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { getApiUrl } from "@/config";

interface Occupant { passRef: string; guestName: string; homeBox: number; }
interface Box { number: number; capacity: number; fixed: boolean; occupants: Occupant[]; }
interface Pass { passRef: string; guestName: string; homeBox: number; currentBox: number | null; fixed: boolean; }

export default function VipBoxScannerPage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const [pass, setPass] = useState<Pass | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => { setToken(localStorage.getItem("vipbox_scanner_token")); }, []);

  async function login() {
    setLoginErr(null);
    try {
      const res = await fetch(getApiUrl("scanner/login"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json?.success && json.data?.token) {
        localStorage.setItem("vipbox_scanner_token", json.data.token);
        setToken(json.data.token);
      } else setLoginErr(json?.message || "Login failed.");
    } catch { setLoginErr("Login failed. Check your connection."); }
  }

  const doScan = useCallback(async (payload: { passRef?: string; qr?: string }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setErr(null); setMsg(null);
    try {
      const res = await fetch(getApiUrl("vip-box/scan"), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { localStorage.removeItem("vipbox_scanner_token"); setToken(null); return; }
      const json = await res.json();
      if (json?.success) { setPass(json.data.pass); setBoxes(json.data.boxes); }
      else { setPass(null); setErr(json?.message || "Pass not recognised."); }
    } catch { setErr("Scan failed — try again."); }
    finally { setTimeout(() => (busyRef.current = false), 800); }
  }, [token]);

  async function allocate(toBox: number) {
    setErr(null);
    try {
      const res = await fetch(getApiUrl("vip-box/allocate"), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passRef: pass?.passRef, toBox }),
      });
      const json = await res.json();
      if (res.ok && json?.success) { setMsg(json.message); setPass(json.data.pass); setBoxes(json.data.boxes); }
      else setErr(json?.message || "Allocation failed.");
    } catch { setErr("Allocation failed."); }
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
        if (code?.data) {
          const now = Date.now();
          if (!(code.data === lastRef.current.code && now - lastRef.current.at < 2500)) {
            lastRef.current = { code: code.data, at: now };
            void doScan({ qr: code.data });
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [doScan]);

  async function startCamera() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setScanning(true); rafRef.current = requestAnimationFrame(tick); }
    } catch { setErr("Could not access camera. Use manual entry."); }
  }
  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    setScanning(false);
  }
  useEffect(() => () => stopCamera(), []);

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold">VIP Box — Rep Scanner</h1>
          <p className="text-white/50 text-sm mt-1">NUSC vs Dempo. Sign in with your scanner account.</p>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full mt-4 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full mt-3 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
          {loginErr && <p className="text-red-400 text-sm mt-2">{loginErr}</p>}
          <button onClick={login} className="w-full mt-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black py-2.5 font-semibold">Sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">VIP Box — Rep Scanner</h1>
          <button onClick={() => { localStorage.removeItem("vipbox_scanner_token"); setToken(null); }} className="text-xs text-white/50 underline">Sign out</button>
        </div>

        {/* camera */}
        <div className="mt-4 rounded-2xl border border-white/15 bg-black/30 overflow-hidden">
          <video ref={videoRef} className="w-full aspect-square object-cover bg-black" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="p-3">
            {!scanning
              ? <button onClick={startCamera} className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black py-2.5 font-semibold">Start camera scan</button>
              : <button onClick={stopCamera} className="w-full rounded-xl border border-white/20 py-2.5 font-semibold">Stop camera</button>}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="VIP-… (manual)" className="flex-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
          <button onClick={() => manual.trim() && doScan({ passRef: manual.trim() })} className="px-4 rounded-lg bg-amber-500 text-black font-semibold">Find</button>
        </div>

        {err && <p className="mt-4 text-red-400">{err}</p>}
        {msg && <p className="mt-4 text-emerald-400 font-semibold">{msg}</p>}

        {pass && (
          <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-2xl font-extrabold">{pass.guestName}</div>
            <div className="text-white/60 text-sm mt-1">Home box {pass.homeBox} · Currently {pass.currentBox ? `Box ${pass.currentBox}` : "unassigned"}{pass.fixed ? " · FIXED" : ""}</div>
            <div className="mt-4 text-sm text-white/70">Allocate to box:</div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {boxes.map((b) => {
                const taken = b.occupants.filter((o) => o.passRef !== pass.passRef);
                const here = pass.currentBox === b.number;
                return (
                  <button key={b.number} onClick={() => allocate(b.number)} disabled={b.fixed}
                    className={`rounded-xl border p-2 text-left disabled:opacity-40 ${here ? "bg-amber-500 text-black border-amber-400" : "border-white/20"}`}>
                    <div className="font-bold">Box {b.number}</div>
                    <div className={`text-[11px] ${here ? "text-black/70" : "text-white/50"}`}>cap {b.capacity}{b.fixed ? " · fixed" : ""}</div>
                    {taken.length > 0 && <div className={`text-[11px] mt-0.5 ${here ? "text-black/80" : "text-amber-300"}`}>{taken.map((o) => o.guestName.split(" ")[0]).join(", ")}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
