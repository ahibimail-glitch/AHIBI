import { useEffect, useRef, useState } from "react";

export default function NWAHeroSection() {
  const [glitch, setGlitch] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const glitchLoop = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3500);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const s = 44;
      ctx.strokeStyle = "rgba(220,38,38,0.10)";
      ctx.lineWidth = 0.5;

      for (let y = 0; y < canvas.height; y += s) {
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 4) {
          const wave = Math.sin(frame * 0.012 + x * 0.018) * 2.5;
          x === 0 ? ctx.moveTo(x, y + wave) : ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }

      for (let x = 0; x < canvas.width; x += s) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(220,38,38,0.05)";
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.55;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 50, cy);
        ctx.lineTo(cx + i * 800, canvas.height + 300);
        ctx.stroke();
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      clearInterval(glitchLoop);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative bg-black h-[60vh] flex items-center justify-center text-center overflow-hidden px-6 py-12">

      {/* Canvas grid */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)" }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.88) 100%)" }}
      />

      {/* Glow blobs */}
      <div
        className="absolute -left-24 top-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(220,38,38,0.18) 0%, transparent 70%)", animation: "pulse 4s ease-in-out infinite" }}
      />
      <div
        className="absolute -right-16 bottom-1/4 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(220,38,38,0.13) 0%, transparent 70%)", animation: "pulse 4s ease-in-out infinite 2s" }}
      />

      {/* HUD corners */}
      <div className="absolute top-6 left-6 w-8 h-8 border-t border-l border-red-700 z-20" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t border-r border-red-700 z-20" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b border-l border-red-700 z-20" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b border-r border-red-700 z-20" />

      {/* Main content */}
      <div className="relative z-30 max-w-4xl mx-auto flex flex-col items-center">

        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 border border-red-800 bg-red-950 bg-opacity-30">
          <span
            className="w-2 h-2 rounded-full bg-red-500"
            style={{ boxShadow: "0 0 8px #ef4444, 0 0 16px rgba(239,68,68,0.5)", animation: "pulse 1.2s ease-in-out infinite" }}
          />
          <span
            className="text-red-400 text-xs font-bold tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            Live Streaming
          </span>
        </div>

        {/* NWA Wrestling */}
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <h1
            className="text-5xl sm:text-6xl font-black leading-none tracking-tighter text-slate-100"
            style={{ fontFamily: "'Orbitron', monospace", textShadow: "0 0 40px rgba(220,38,38,0.2)" }}
          >
            NWA
          </h1>
          <h1
            className="text-4xl sm:text-5xl font-black leading-none tracking-tighter text-red-500"
            style={{
              fontFamily: "'Orbitron', monospace",
              textShadow: glitch
                ? "-3px 0 #00ffff, 3px 0 #ff00ff"
                : "0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,38,0.3)",
              transform: glitch ? "skewX(-1.5deg) translateX(2px)" : "none",
              transition: "text-shadow 0.05s, transform 0.05s",
            }}
          >
            Wrestling
          </h1>
        </div>

        {/* Championships */}
        <h1
          className="text-3xl sm:text-4xl font-black leading-none tracking-tighter mb-6 text-slate-300"
          style={{ fontFamily: "'Orbitron', monospace", textShadow: "0 0 20px rgba(220,38,38,0.15)" }}
        >
          Championships
        </h1>

        {/* Divider row */}
        <div className="flex items-center gap-4 mb-6 w-full justify-center">
          <div className="h-px w-16" style={{ background: "linear-gradient(to right, transparent, rgba(239,68,68,0.6))" }} />
          <span
            className="text-slate-500 text-xs font-semibold tracking-widest uppercase"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            HD Quality · Live & On-Demand · Secure Payments
          </span>
          <div className="h-px w-16" style={{ background: "linear-gradient(to left, transparent, rgba(239,68,68,0.6))" }} />
        </div>

        {/* CTA Button */}
        <a
          href="/livestream"
          className="group inline-flex items-center gap-3 px-10 py-3 border border-red-700 text-white text-sm font-bold tracking-widest uppercase relative overflow-hidden transition-all duration-300 hover:bg-red-950 hover:bg-opacity-50 hover:border-red-500"
          style={{
            fontFamily: "'Orbitron', monospace",
            clipPath: "polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 24px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
        >
          Purchase Now
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>

        {/* Stats row */}
        <div className="flex items-center gap-8 mt-8">
          {[{ val: "4K", label: "Resolution" }, { val: "0ms", label: "Delay" }, { val: "24/7", label: "On-Demand" }].map((s, i) => (
            <div key={s.label} className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-2xl font-black text-red-500"
                  style={{ fontFamily: "'Orbitron', monospace", textShadow: "0 0 12px rgba(239,68,68,0.5)" }}
                >
                  {s.val}
                </span>
                <span
                  className="text-xs font-semibold tracking-widest uppercase text-slate-600"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className="w-px h-10 bg-red-900 opacity-50" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}