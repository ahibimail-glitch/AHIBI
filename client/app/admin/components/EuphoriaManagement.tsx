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

const RED = "#e31837";

export default function EuphoriaManagement() {
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
      else setErr(c?.message || "Could not load config.");
      if (s?.success) setStats(s.data);
      if (b?.success) setBookings(b.data);
    } catch {
      setErr("Failed to load Euphoria data.");
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
    return <div className="p-6 text-gray-700">Please sign in to the admin dashboard first.</div>;
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Euphoria Festival 2026</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className={`px-3 py-1 rounded-full font-medium ${config?.bookingOpen ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
            {config?.bookingOpen ? "Bookings OPEN" : "Bookings closed"}
          </span>
        </div>
      </div>
      {err && <p className="mt-3 text-red-600 text-sm">{err}</p>}
      {msg && <p className="mt-3 text-emerald-600 text-sm">{msg}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat label="Revenue (live)" value={`₹${stats.revenue?.toLocaleString("en-IN")}`} />
          <Stat label="Bookings" value={stats.bookings} />
          <Stat label="Entry people" value={stats.entryPeople} />
          <Stat label="Camping" value={`${stats.camping?.booked}/${stats.camping?.capacity}`} />
        </div>
      )}
      {stats?.expectedAttendancePerDay && (
        <div className="mt-3 text-sm text-gray-500">
          Expected entry per day:{" "}
          {Object.entries(stats.expectedAttendancePerDay).map(([d, n]) => `${d}: ${n}`).join("  ·  ")}
          {stats.testRevenue ? `   ·   (test revenue ₹${stats.testRevenue})` : ""}
        </div>
      )}

      {config && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-5">
          <label className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Bookings open</span>
            <input type="checkbox" checked={config.bookingOpen} onChange={(e) => setConfig({ ...config, bookingOpen: e.target.checked })} className="w-6 h-6" style={{ accentColor: RED }} />
          </label>

          <div>
            <h3 className="font-semibold mb-2 text-gray-900">Festival entry prices (per person)</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="1 day" value={config.entryPrices.oneDay} onChange={(v) => setConfig({ ...config, entryPrices: { ...config.entryPrices, oneDay: num(v) } })} />
              <Field label="2 days" value={config.entryPrices.twoDay} onChange={(v) => setConfig({ ...config, entryPrices: { ...config.entryPrices, twoDay: num(v) } })} />
              <Field label="3 days" value={config.entryPrices.threeDay} onChange={(v) => setConfig({ ...config, entryPrices: { ...config.entryPrices, threeDay: num(v) } })} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-gray-900">Camping prices (per person)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="No-tent / night" value={config.campingNoTentPerNight} onChange={(v) => setConfig({ ...config, campingNoTentPerNight: num(v) })} />
              <Field label="Tent 1 night" value={config.campingTent.oneNight} onChange={(v) => setConfig({ ...config, campingTent: { ...config.campingTent, oneNight: num(v) } })} />
              <Field label="Tent 2 nights" value={config.campingTent.twoNight} onChange={(v) => setConfig({ ...config, campingTent: { ...config.campingTent, twoNight: num(v) } })} />
              <Field label="Tent 3 nights" value={config.campingTent.threeNight} onChange={(v) => setConfig({ ...config, campingTent: { ...config.campingTent, threeNight: num(v) } })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Camping capacity (people)" value={config.campingCapacity} onChange={(v) => setConfig({ ...config, campingCapacity: num(v) })} />
            <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <span className="text-sm text-gray-600">Camping includes entry</span>
              <input type="checkbox" checked={config.campingIncludesEntry} onChange={(e) => setConfig({ ...config, campingIncludesEntry: e.target.checked })} className="w-5 h-5" style={{ accentColor: RED }} />
            </label>
          </div>

          <div>
            <label className="text-sm text-gray-600">Festival days (comma-separated ISO)</label>
            <input
              value={config.festivalDays.join(", ")}
              onChange={(e) => setConfig({ ...config, festivalDays: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
              className="w-full mt-1 rounded-lg bg-white border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>

          <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-xl text-white font-semibold disabled:opacity-40" style={{ backgroundColor: RED }}>
            {saving ? "Saving…" : "Save (live immediately)"}
          </button>
        </div>
      )}

      <h2 className="text-lg font-semibold mt-10 mb-3 text-gray-900">Recent bookings</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
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
              <tr key={b.orderId} className="border-t border-gray-100">
                <td className="p-2 text-gray-900">{b.contact?.name}<div className="text-gray-400 text-xs">{b.contact?.email}</div></td>
                <td className="p-2 text-gray-700">{b.entry?.people ? `${b.entry.people}p · ${b.entry.days?.length}d` : "—"}</td>
                <td className="p-2 text-gray-700">{b.camping?.people ? `${b.camping.people}p · ${b.camping.type}` : "—"}</td>
                <td className="p-2 text-right text-gray-900">{b.amount}{b.test ? " (test)" : ""}</td>
                <td className="p-2 text-gray-700">{b.status}</td>
                <td className="p-2 text-gray-400">{new Date(b.createdAt).toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-gray-400">No bookings yet.</td></tr>
            )}
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

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 rounded-lg bg-white border border-gray-300 px-3 py-2 text-gray-900" />
    </div>
  );
}
