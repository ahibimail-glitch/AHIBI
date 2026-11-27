"use client";

import { useEffect, useState, useCallback } from "react";
import { getApiUrl } from "@/config";

interface Config {
  festivalDays: string[];
  entryPrices: { oneDay: number; twoDay: number; threeDay: number };
  campingNoTentPerNight: number;
  campingTent: { oneNight: number; twoNight: number; threeNight: number };
  campingCapacity: number;
  campingBooked: number;
  campingIncludesEntry: boolean;
  bookingOpen: boolean;
}

export default function EuphoriaAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("admin_token"));
  }, []);

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [c, s, b] = await Promise.all([
        fetch(getApiUrl("euphoria/admin/config"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(getApiUrl("euphoria/admin/stats"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(getApiUrl("euphoria/admin/bookings?limit=50"), { headers: authHeaders() }).then((r) => r.json()),
      ]);
      if (c?.success) setConfig(c.data);
      else setErr(c?.message || "Could not load config (are you logged in as admin?)");
      if (s?.success) setStats(s.data);
      if (b?.success) setBookings(b.data);
    } catch {
      setErr("Failed to load Euphoria admin data.");
    }
  }, [token, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!config) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(getApiUrl("euphoria/admin/config"), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          entryPrices: config.entryPrices,
          campingNoTentPerNight: config.campingNoTentPerNight,
          campingTent: config.campingTent,
          campingCapacity: config.campingCapacity,
          campingIncludesEntry: config.campingIncludesEntry,
          bookingOpen: config.bookingOpen,
          festivalDays: config.festivalDays,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setMsg("Saved. Changes are live immediately.");
        setConfig(json.data);
        load();
      } else setErr(json?.message || "Save failed.");
    } catch {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return <div className="p-8 text-white">Please sign in to the admin dashboard first.</div>;
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Euphoria Festival 2026 — Controls</h1>
        {err && <p className="mt-3 text-red-400 text-sm">{err}</p>}
        {msg && <p className="mt-3 text-emerald-400 text-sm">{msg}</p>}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Stat label="Revenue (live)" value={`₹${stats.revenue}`} />
            <Stat label="Bookings" value={stats.bookings} />
            <Stat label="Entry people" value={stats.entryPeople} />
            <Stat label="Camping" value={`${stats.camping.booked}/${stats.camping.capacity}`} />
          </div>
        )}
        {stats?.expectedAttendancePerDay && (
          <div className="mt-3 text-sm text-white/60">
            Expected entry per day:{" "}
            {Object.entries(stats.expectedAttendancePerDay).map(([d, n]) => `${d}: ${n}`).join("  ·  ")}
            {stats.testRevenue ? `   ·   (test revenue ₹${stats.testRevenue})` : ""}
          </div>
        )}

        {/* Config */}
        {config && (
          <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-5 space-y-5">
            <label className="flex items-center justify-between">
              <span className="text-lg font-semibold">Bookings open</span>
              <input
                type="checkbox"
                checked={config.bookingOpen}
                onChange={(e) => setConfig({ ...config, bookingOpen: e.target.checked })}
                className="w-6 h-6 accent-violet-600"
              />
            </label>

            <div>
              <h3 className="font-semibold mb-2">Festival entry prices (per person)</h3>
              <div className="grid grid-cols-3 gap-3">
                <Field label="1 day" value={config.entryPrices.oneDay} onChange={(v) => setConfig({ ...config, entryPrices: { ...config.entryPrices, oneDay: num(v) } })} />
                <Field label="2 days" value={config.entryPrices.twoDay} onChange={(v) => setConfig({ ...config, entryPrices: { ...config.entryPrices, twoDay: num(v) } })} />
                <Field label="3 days" value={config.entryPrices.threeDay} onChange={(v) => setConfig({ ...config, entryPrices: { ...config.entryPrices, threeDay: num(v) } })} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Camping prices (per person)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="No-tent / night" value={config.campingNoTentPerNight} onChange={(v) => setConfig({ ...config, campingNoTentPerNight: num(v) })} />
                <Field label="Tent 1 night" value={config.campingTent.oneNight} onChange={(v) => setConfig({ ...config, campingTent: { ...config.campingTent, oneNight: num(v) } })} />
                <Field label="Tent 2 nights" value={config.campingTent.twoNight} onChange={(v) => setConfig({ ...config, campingTent: { ...config.campingTent, twoNight: num(v) } })} />
                <Field label="Tent 3 nights" value={config.campingTent.threeNight} onChange={(v) => setConfig({ ...config, campingTent: { ...config.campingTent, threeNight: num(v) } })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Camping capacity (people)" value={config.campingCapacity} onChange={(v) => setConfig({ ...config, campingCapacity: num(v) })} />
              <label className="flex items-center justify-between rounded-lg border border-white/15 px-3">
                <span className="text-sm text-white/70">Camping includes entry</span>
                <input type="checkbox" checked={config.campingIncludesEntry} onChange={(e) => setConfig({ ...config, campingIncludesEntry: e.target.checked })} className="w-5 h-5 accent-violet-600" />
              </label>
            </div>

            <div>
              <label className="text-sm text-white/70">Festival days (comma-separated ISO)</label>
              <input
                value={config.festivalDays.join(", ")}
                onChange={(e) => setConfig({ ...config, festivalDays: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2"
              />
            </div>

            <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 font-semibold">
              {saving ? "Saving…" : "Save (live immediately)"}
            </button>
          </div>
        )}

        {/* Bookings */}
        <h2 className="text-lg font-semibold mt-10 mb-3">Recent bookings</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Entry</th>
                <th className="text-left p-2">Camping</th>
                <th className="text-right p-2">₹</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">When</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.orderId} className="border-t border-white/5">
                  <td className="p-2">{b.contact?.name}<div className="text-white/40 text-xs">{b.contact?.email}</div></td>
                  <td className="p-2">{b.entry?.people ? `${b.entry.people}p · ${b.entry.days?.length}d` : "—"}</td>
                  <td className="p-2">{b.camping?.people ? `${b.camping.people}p · ${b.camping.type}` : "—"}</td>
                  <td className="p-2 text-right">{b.amount}{b.test ? " (test)" : ""}</td>
                  <td className="p-2">{b.status}</td>
                  <td className="p-2 text-white/50">{new Date(b.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-white/40">No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-white/60">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2" />
    </div>
  );
}
