"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, RefreshCw, Search, Users, IndianRupee, Target } from "lucide-react";

type Row = {
  id: string;
  reference: string;
  date: string;
  slot: string;
  players: number;
  amount: number;
  customerName: string;
  customerPhone: string;
  needSpecialBullets: boolean;
  checkedIn: boolean;
  status: string;
  createdAt: string;
};

export default function GeBlasterBookings() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [playersTotal, setPlayersTotal] = useState(0);
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      const res = await fetch(`/api/ge-blaster/admin/bookings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load bookings.");
      setRows(json.data.bookings || []);
      setTotal(json.data.total || 0);
      setRevenue(json.data.revenue || 0);
      setPlayersTotal(json.data.playersTotal || 0);
    } catch (e: any) {
      setError(e?.message || "Failed to load bookings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const seedEvent = async () => {
    const ownerEmail = window.prompt("Venue owner's AHIBI email to give them the dashboard (optional — leave blank to skip):", "") || "";
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/ge-blaster/admin/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(ownerEmail.trim() ? { ownerEmail: ownerEmail.trim() } : {}),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Setup failed.");
      alert(`GE Blaster event is ready.\nEvent id: ${json.data.eventId}\nSlots: ${json.data.slots.length}\nActive dates: ${json.data.activeDates}${json.data.organizerPromoted ? "\nOwner promoted to organizer." : ""}`);
      fetchBookings();
    } catch (e: any) {
      alert(e?.message || "Setup failed.");
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.reference, r.customerName, r.customerPhone, r.slot, r.date].join(" ").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const exportCsv = () => {
    const header = ["Reference", "Date", "Slot", "Players", "Amount", "Customer", "Phone", "Special Bullets", "Checked In", "Status"];
    const lines = filtered.map((r) =>
      [r.reference, r.date, r.slot, r.players, r.amount, r.customerName, r.customerPhone, r.needSpecialBullets ? "Yes" : "No", r.checkedIn ? "Yes" : "No", r.status]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ge-blaster-bookings${dateFilter ? `-${dateFilter}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GE Blaster Bookings</h2>
          <p className="text-sm text-gray-500">Daily Blaster Experience — exclusive 40-minute slots.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={seedEvent} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Set up / refresh event
          </button>
          <button onClick={fetchBookings} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Bookings", value: total, Icon: CalendarDays },
          { label: "Players", value: playersTotal, Icon: Users },
          { label: "Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, Icon: IndianRupee },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, reference, slot…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-300"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter("")} className="text-sm text-blue-600 hover:underline">Clear</button>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Players</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Bullets</th>
              <th className="px-4 py-3">Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No bookings found.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{r.reference}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.slot}</td>
                  <td className="px-4 py-3 text-gray-700">{r.players}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-700">{r.customerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.customerPhone}</td>
                  <td className="px-4 py-3">
                    {r.needSpecialBullets ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Target className="h-3 w-3" /> Yes
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.checkedIn ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Checked in</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">Booked</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
