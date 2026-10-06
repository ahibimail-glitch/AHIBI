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
  workshops: Array<{
    name: string;
    day: string;
  }>;
  days: Array<{
    day: string;
    workshops: string[];
  }>;
};

type Stats = {
  total: number;
  byDay: Record<string, number>;
  byWorkshop: Record<string, number>;
};

export default function WorkshopRsvpRegistrations() {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, byDay: {}, byWorkshop: {} });
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("");

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams();

      if (search.trim()) params.set("q", search.trim());
      if (dayFilter) params.set("day", dayFilter);
      if (workshopFilter) params.set("workshop", workshopFilter);

      const response = await fetch(`/api/workshop-rsvp/admin/registrations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to fetch workshop registrations.");
      }

      setRegistrations(result.data.registrations || []);
      setEventConfig(result.data.event || null);
      setStats(result.data.stats || { total: 0, byDay: {}, byWorkshop: {} });
    } catch (error) {
      console.error("Failed to fetch workshop RSVP registrations:", error);
      setRegistrations([]);
      setStats({ total: 0, byDay: {}, byWorkshop: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [search, dayFilter, workshopFilter]);

  const dayCards = useMemo(() => {
    const days = eventConfig?.days?.map((item) => item.day) || ["Day 1", "Day 2", "Day 3"];
    return days.map((day) => ({
      day,
      total: stats.byDay?.[day] || 0,
    }));
  }, [eventConfig, stats]);

  const exportCsv = () => {
    const headers = [
      "Registration Number",
      "Name",
      "Phone",
      "Location",
      "Workshop",
      "Day",
      "Status",
      "Registered At",
    ];

    const rows = registrations.map((registration) => [
      registration.registrationNumber,
      registration.name,
      registration.phone,
      registration.location,
      registration.workshop,
      registration.day,
      registration.status,
      new Date(registration.createdAt).toLocaleString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ahibi-workshop-rsvp-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workshop RSVP Registrations</h2>
          <p className="mt-1 text-sm text-gray-600">
            Free event registrations grouped automatically by workshop and day.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchRegistrations}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total RSVPs</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        {dayCards.map((item) => (
          <div key={item.day} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{item.day}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{item.total}</p>
              </div>
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                <CalendarDays className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.7fr_0.9fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone, location or reference"
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={dayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">All Days</option>
            {(eventConfig?.days || []).map((item) => (
              <option key={item.day} value={item.day}>
                {item.day}
              </option>
            ))}
          </select>

          <select
            value={workshopFilter}
            onChange={(event) => setWorkshopFilter(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">All Workshops</option>
            {(eventConfig?.workshops || []).map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Reference",
                  "Name",
                  "Phone",
                  "Location",
                  "Workshop",
                  "Day",
                  "Registered",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                    Loading workshop registrations...
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                    No registrations found for the selected filters.
                  </td>
                </tr>
              ) : (
                registrations.map((registration) => (
                  <tr key={registration._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-medium text-blue-700">
                      {registration.registrationNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-900">
                      {registration.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                      {registration.phone}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{registration.location}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-900">
                      {registration.workshop}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {registration.day}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                      {new Date(registration.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
