"use client";

import { useEffect, useState, useCallback } from "react";
import { getApiUrl } from "@/config";

const BLUE = "#0b5cab";

interface Slot { id: string; label: string; capacity: number; }
interface Product { id: string; name: string; sector: string; pricePerSeat: number; seatsPerFlight: number; slots: Slot[]; active?: boolean; }
interface Config { operatingDays: string[]; bookingOpen: boolean; products: Product[]; }

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function HeliTaxiiManagement() {
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => { setToken(localStorage.getItem("admin_token")); }, []);
  const headers = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [c, s, b] = await Promise.all([
        fetch(getApiUrl("heli-2026/admin/config"), { headers: headers() }).then((r) => r.json()),
        fetch(getApiUrl("heli-2026/admin/stats"), { headers: headers() }).then((r) => r.json()),
        fetch(getApiUrl("heli-2026/admin/bookings?limit=100"), { headers: headers() }).then((r) => r.json()),
      ]);
      if (c?.success) setConfig(c.data); else setErr(c?.message || "Could not load config.");
      if (s?.success) setStats(s.data);
      if (b?.success) setBookings(b.data);
    } catch { setErr("Failed to load Heli data."); }
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!config) return;
    setSaving(true); setMsg(null); setErr(null);
    try {
      const res = await fetch(getApiUrl("heli-2026/admin/config"), {
        method: "PUT", headers: headers(),
        body: JSON.stringify({
          bookingOpen: config.bookingOpen,
          products: config.products.map((p) => ({ id: p.id, pricePerSeat: p.pricePerSeat, slots: p.slots.map((s) => ({ id: s.id, capacity: s.capacity })) })),
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) { setMsg("Saved. Live immediately."); setConfig(json.data); load(); }
      else setErr(json?.message || "Save failed.");
    } catch { setErr("Save failed."); } finally { setSaving(false); }
  }

  async function downloadManifest() {
    try {
      const url = getApiUrl(`heli-2026/admin/manifest.csv${dateFilter ? `?date=${encodeURIComponent(dateFilter)}` : ""}`);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `heli-taxi-2026-manifest${dateFilter ? "-" + dateFilter : ""}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { setErr("Could not download manifest."); }
  }

  if (!token) return <div className="p-6 text-gray-700">Please sign in to the admin dashboard first.</div>;
  const setProduct = (id: string, patch: Partial<Product>) =>
    config && setConfig({ ...config, products: config.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Hornbill Heli Taxi 2026</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config?.bookingOpen ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
          {config?.bookingOpen ? "Bookings OPEN" : "Bookings closed"}
        </span>
      </div>
      {err && <p className="mt-3 text-red-600 text-sm">{err}</p>}
      {msg && <p className="mt-3 text-emerald-600 text-sm">{msg}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat label="Revenue (live)" value={`₹${(stats.revenue || 0).toLocaleString("en-IN")}`} />
          <Stat label="Bookings" value={stats.bookings} />
          <Stat label="Seats sold" value={stats.seatsSold} />
          <Stat label="Test revenue" value={`₹${(stats.testRevenue || 0).toLocaleString("en-IN")}`} />
        </div>
      )}

      {/* Manifest download */}
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All dates</option>
          {config?.operatingDays.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
        </select>
        <button onClick={downloadManifest} className="px-5 py-2 rounded-xl text-white font-semibold text-sm" style={{ backgroundColor: BLUE }}>
          Download manifest (CSV) for operator
        </button>
      </div>

      {/* Flights fill */}
      {stats?.flights && stats.flights.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Flights — fill status</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500"><tr>
                <th className="text-left p-2">Date</th><th className="text-left p-2">Ride</th><th className="text-left p-2">Slot</th>
                <th className="text-right p-2">Seats</th><th className="text-right p-2">Full flights</th><th className="text-left p-2">Status</th>
              </tr></thead>
              <tbody>
                {stats.flights.map((f: any, i: number) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2 text-gray-700">{fmtDate(f.date)}</td>
                    <td className="p-2 text-gray-900">{f.productName}{f.sector ? ` — ${f.sector}` : ""}</td>
                    <td className="p-2 text-gray-700">{f.slotLabel}</td>
                    <td className="p-2 text-right text-gray-900">{f.seats}/{f.capacity}</td>
                    <td className="p-2 text-right text-gray-700">{f.fullFlights}{f.unfilledRemainder ? ` (+${f.unfilledRemainder})` : ""}</td>
                    <td className="p-2">{f.willNotFly ? <span className="text-red-600 font-medium">Under 6 — won't fly</span> : <span className="text-emerald-600">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Config */}
      {config && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-5">
          <label className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Bookings open</span>
            <input type="checkbox" checked={config.bookingOpen} onChange={(e) => setConfig({ ...config, bookingOpen: e.target.checked })} className="w-6 h-6" style={{ accentColor: BLUE }} />
          </label>
          {config.products.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-semibold text-gray-900">{p.name}{p.sector ? ` — ${p.sector}` : ""}</div>
                <label className="text-xs text-gray-500 flex items-center gap-2">Price/seat ₹
                  <input type="number" value={p.pricePerSeat} onChange={(e) => setProduct(p.id, { pricePerSeat: Number(e.target.value) })}
                    className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-gray-900" />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                {p.slots.map((s) => (
                  <label key={s.id} className="text-xs text-gray-500 flex items-center justify-between gap-2 border border-gray-100 rounded px-2 py-1">
                    <span>{s.label} — seats/day</span>
                    <input type="number" value={s.capacity}
                      onChange={(e) => setProduct(p.id, { slots: p.slots.map((x) => (x.id === s.id ? { ...x, capacity: Number(e.target.value) } : x)) })}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-gray-900" />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-xl text-white font-semibold disabled:opacity-40" style={{ backgroundColor: BLUE }}>
            {saving ? "Saving…" : "Save (live immediately)"}
          </button>
        </div>
      )}

      {/* Bookings */}
      <h2 className="text-lg font-semibold mt-10 mb-3 text-gray-900">Recent bookings</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500"><tr>
            <th className="text-left p-2">Ref</th><th className="text-left p-2">Booked by</th><th className="text-left p-2">Ride</th>
            <th className="text-left p-2">Date/Slot</th><th className="text-right p-2">Seats</th><th className="text-right p-2">₹</th><th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.orderId} className="border-t border-gray-100">
                <td className="p-2 font-mono text-xs text-gray-700">{b.bookingRef || "—"}</td>
                <td className="p-2 text-gray-900">{b.contact?.name}<div className="text-gray-400 text-xs">{b.contact?.phone}</div></td>
                <td className="p-2 text-gray-700">{b.productName}{b.sector ? ` — ${b.sector}` : ""}</td>
                <td className="p-2 text-gray-700">{fmtDate(b.date)} · {b.slotLabel}</td>
                <td className="p-2 text-right text-gray-900">{b.seats}</td>
                <td className="p-2 text-right text-gray-900">{b.amount}{b.test ? " (t)" : ""}</td>
                <td className="p-2 text-gray-700">{b.status}</td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold mt-1 text-gray-900">{value}</div>
    </div>
  );
}
