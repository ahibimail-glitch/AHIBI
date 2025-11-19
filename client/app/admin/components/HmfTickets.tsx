"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface Booking {
  _id: string;
  event: any;
  eventSnapshot?: { _id?: string; title?: string; startDate?: string };
  user: { name?: string; email?: string; phone?: string };
  bookedAt: string;
  ticketType?: string;
  quantity?: number;
  total?: number;
  status?: string;
  paymentId?: string;
  paymentStatus?: string;
  country?: string;
  state?: string;
  modeOfPayment?: string;
}

const HMF_IDS = [
  "691b1066a9a25d4fec36f96c",
  "691b13caa9a25d4fec36fa70",
  "691b146fa9a25d4fec36fb25",
  "691b14f1a9a25d4fec36fbd7",
  "691b156ea9a25d4fec36fc8d",
  "691b15c5a9a25d4fec36fd3a",
  "691b15faa9a25d4fec36fd3f",
  "691b162ca9a25d4fec36fd44",
  "691b1771a9a25d4fec36feaf",
];

export default function HmfTickets() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("admin_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const resp = await fetch(`${apiUrl}/api/admin/bookings/all`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!resp.ok) throw new Error("Failed to fetch bookings");
        const data = await resp.json();
        const list: Booking[] = Array.isArray(data?.bookings) ? data.bookings : [];
        // Filter by HMF event IDs (from event or snapshot)
        const filtered = list.filter((b) => {
          const id = String(b.event?._id || b.eventSnapshot?._id || "");
          return HMF_IDS.includes(id);
        });
        setBookings(filtered);
      } catch (e: any) {
        setError(e?.message || "Failed to load HMF tickets");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      const title = String(b.event?.title || b.eventSnapshot?.title || "").toLowerCase();
      const name = String(b.user?.name || "").toLowerCase();
      const email = String(b.user?.email || "").toLowerCase();
      const phone = String(b.user?.phone || "");
      return title.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [bookings, search]);

  const handleExport = () => {
    const rows = visible.map((b) => ({
      BookingID: b._id,
      Event: b.event?.title || b.eventSnapshot?.title || "",
      TicketType: b.ticketType || "",
      Quantity: b.quantity,
      Total: b.total,
      Status: b.status,
      Source: b.paymentId ? 'Online' : 'Manual',
      Country: b.country || '',
      State: b.state || '',
      'Mode of Payment': b.paymentId ? 'Online' : (b.modeOfPayment || 'Manual'),
      Customer: b.user?.name || "",
      Email: b.user?.email || "",
      Phone: b.user?.phone || "",
      BookedAt: b.bookedAt ? format(new Date(b.bookedAt), "yyyy-MM-dd HH:mm") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HMF Tickets");
    XLSX.writeFile(wb, `hmf_tickets_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>HMF Tickets</CardTitle>
          <CardDescription>Filtered bookings for selected HMF events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Input
              placeholder="Search by event, name, email, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={handleExport} disabled={visible.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Mode of Payment</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Booked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell>{b.event?.title || b.eventSnapshot?.title}</TableCell>
                      <TableCell>{b.ticketType || "-"}</TableCell>
                      <TableCell>{b.quantity}</TableCell>
                      <TableCell>₹{b.total}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.paymentId ? 'secondary' : 'outline'}>{b.paymentId ? 'Online' : 'Manual'}</Badge>
                      </TableCell>
                      <TableCell>{b.country || '-'}</TableCell>
                      <TableCell>{b.state || '-'}</TableCell>
                      <TableCell>
                        {b.paymentId ? (
                          <Badge variant="secondary">Online</Badge>
                        ) : (
                          b.modeOfPayment ? (
                            <Badge variant="outline">{b.modeOfPayment}</Badge>
                          ) : (
                            <Badge variant="outline">Manual</Badge>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{b.user?.name || "-"}</span>
                          <span className="text-xs text-gray-500">{b.user?.email || ""}</span>
                          <span className="text-xs text-gray-500">{b.user?.phone || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell>{b.bookedAt ? format(new Date(b.bookedAt), "dd MMM yyyy, HH:mm") : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-gray-500">
                        No bookings found for HMF events.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
