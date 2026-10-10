"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, RefreshCw, Search, Users } from "lucide-react";

type Registration = {
  _id: string;
  registrationNumber: string;
  name: string;
  phone: string;
  location: string;
  workshop: string;
  day: string;
  status: string;
  createdAt: string;
};

type EventConfig = {
  title: string;
  workshops: Array<{ name: string; day: string }>;
  days: Array<{ day: string; workshops: string[] }>;
};

export default function WorkshopRsvp() {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [stats, setStats] = useState<{ total: number; byDay: Record<string, number>; byWorkshop: Record<string, number> }>({ total: 0, byDay: {}, byWorkshop: {} });
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("");
  const [error, setError] = useState("");

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("organizer_token");
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (dayFilter) params.set("day", dayFilter);
      if (workshopFilter) params.set("workshop", workshopFilter);
      const res = await fetch(`/api/workshop-rsvp/organizer/registrations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Could not load registrations.");
      setRegistrations(json.data.registrations || []);
      setStats(json.data.stats || { total: 0, byDay: {}, byWorkshop: {} });
      setEventConfig(json.data.event || null);
    } catch (e: any) {
      setError(e?.message || "Could not load registrations.");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayFilter, workshopFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter((r) =>
      [r.registrationNumber, r.name, r.phone, r.location, r.workshop, r.day].join(" ").toLowerCase().includes(q)
    );
  }, [registrations, search]);

  const days = eventConfig?.days?.map((d) => d.day) || [];
  const workshopNames = (eventConfig?.workshops || []).map((w) => w.name);

  const exportCsv = () => {
    const header = ["Reference", "Name", "Phone", "Location", "Workshop", "Day", "Status"];
    const lines = filtered.map((r) =>
      [r.registrationNumber, r.name, r.phone, r.location, r.workshop, r.day, r.status]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workshop-rsvp-registrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workshop RSVP Registrations</h2>
          <p className="text-sm text-gray-500">WENN Bazaar workshops — RSVP list by day and workshop.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRegistrations} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500"><Users className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Total RSVPs</span></div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500"><CalendarDays className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">By day</span></div>
          <p className="mt-1 text-sm text-gray-700">{Object.keys(stats.byDay).length ? Object.entries(stats.byDay).map(([d, n]) => `${d}: ${n}`).join(" · ") : "—"}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500"><Users className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Workshops</span></div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{Object.keys(stats.byWorkshop).length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, reference…" className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-300">
          <option value="">All days</option>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={workshopFilter} onChange={(e) => setWorkshopFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-300">
          <option value="">All workshops</option>
          {workshopNames.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Workshop</th>
              <th className="px-4 py-3">Day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No registrations yet.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{r.registrationNumber}</td>
                  <td className="px-4 py-3 text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{r.location}</td>
                  <td className="px-4 py-3 text-gray-800">{r.workshop}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.day}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
