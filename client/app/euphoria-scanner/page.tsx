"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { getApiUrl } from "@/config";

type ScanStatus = "VALID" | "INVALID" | "ALREADY_USED" | null;

export default function EuphoriaScannerPage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const [manual, setManual] = useState("");
  const [dayOverride, setDayOverride] = useState("");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<ScanStatus>(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    setToken(localStorage.getItem("euphoria_scanner_token"));
  }, []);

  async function login() {
    setLoginErr(null);
    try {
      const res = await fetch(getApiUrl("scanner/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json?.success && json.data?.token) {
        localStorage.setItem("euphoria_scanner_token", json.data.token);
        setToken(json.data.token);
      } else setLoginErr(json?.message || "Login failed.");
    } catch {
      setLoginErr("Login failed. Check your connection.");
    }
  }

  const submitScan = useCallback(
    async (payload: { ticketNumber?: string; qr?: string }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const body: any = { ...payload };
        if (dayOverride && /^\d{4}-\d{2}-\d{2}$/.test(dayOverride)) body.day = dayOverride;
        const res = await fetch(getApiUrl("euphoria/scan"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (res.status === 401) {
          localStorage.removeItem("euphoria_scanner_token");
          setToken(null);
          return;
        }
        const json = await res.json();
        setResult(json);
        setStatus(json?.status || "INVALID");
      } catch {
        setResult({ message: "Network error — try again." });
        setStatus("INVALID");
      } finally {
        setTimeout(() => (busyRef.current = false), 700);
      }
    },
    [token, dayOverride]
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data) {
          const now = Date.now();
          if (!(code.data === lastRef.current.code && now - lastRef.current.at < 2500)) {
            lastRef.current = { code: code.data, at: now };
            void submitScan({ qr: code.data });
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [submitScan]);

  async function startCamera() {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch {
      setCamError("Could not access camera. Use manual entry below.");
    }
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
          <h1 className="text-xl font-bold">Euphoria Gate Scanner</h1>
          <p className="text-white/50 text-sm mt-1">Sign in with your scanner account.</p>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full mt-4 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full mt-3 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
          {loginErr && <p className="text-red-400 text-sm mt-2">{loginErr}</p>}
          <button onClick={login} className="w-full mt-4 rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 font-semibold">Sign in</button>
        </div>
      </div>
    );
  }

  const banner =
    status === "VALID" ? "bg-emerald-600" : status === "ALREADY_USED" ? "bg-amber-600" : status === "INVALID" ? "bg-red-600" : "bg-neutral-800";

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Euphoria Gate Scanner</h1>
          <button onClick={() => { localStorage.removeItem("euphoria_scanner_token"); setToken(null); }} className="text-xs text-white/50 underline">Sign out</button>
        </div>

        {status && (
          <div className={`mt-4 rounded-2xl ${banner} p-5 text-center`}>
            <div className="text-2xl font-extrabold">{status === "VALID" ? "✓ ENTRY APPROVED" : status === "ALREADY_USED" ? "⚠ ALREADY USED" : "✕ NOT VALID"}</div>
            {result?.attendeeName && <div className="mt-1 font-semibold">{result.attendeeName}</div>}
            {result?.ticketType && <div className="text-sm text-white/90">{result.ticketType}</div>}
            {result?.message && <div className="text-sm text-white/80 mt-1">{result.message}</div>}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/15 bg-black/30 overflow-hidden">
          <video ref={videoRef} className="w-full aspect-square object-cover bg-black" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="p-3">
            {!scanning ? (
              <button onClick={startCamera} className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 font-semibold">Start camera scan</button>
            ) : (
              <button onClick={stopCamera} className="w-full rounded-xl border border-white/20 py-2.5 font-semibold">Stop camera</button>
            )}
            {camError && <p className="text-amber-400 text-xs mt-2">{camError}</p>}
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm text-white/60">Manual ticket entry</label>
          <div className="flex gap-2 mt-1">
            <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="EUPH-…" className="flex-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
            <button onClick={() => manual.trim() && submitScan({ ticketNumber: manual.trim() })} className="px-4 rounded-lg bg-violet-600 hover:bg-violet-500 font-semibold">Check</button>
          </div>
          <label className="text-xs text-white/40 mt-3 block">Day override (testing only, YYYY-MM-DD — leave blank at the gate)</label>
          <input value={dayOverride} onChange={(e) => setDayOverride(e.target.value.trim())} placeholder="" className="w-full mt-1 rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-sm" />
        </div>
      </div>
    </div>
  );
}
