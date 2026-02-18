"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type AnnieFailedBooking = {
  _id: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: string;
  user?: { name?: string; email?: string; phone?: string } | null;
  userSnapshot?: { name?: string; email?: string; phone?: string } | null;
  notes?: string;
  description?: string;
};

export default function AnnieFailedBookings() {
  const [items, setItems] = useState<AnnieFailedBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("admin_token") || "";
  }, []);

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/payments/annie-failed-bookings`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch Annie Musical failed bookings");
      const json = await res.json();
      setItems(json.data?.items || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      console.log('[AnnieFailedBookings] Attempting to resolve transaction:', id);
      
      const res = await fetch(`${apiUrl}/api/admin/payments/resolve/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      
      console.log('[AnnieFailedBookings] Response status:', res.status);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[AnnieFailedBookings] Error response:', err);
        throw new Error(err.message || "Failed to resolve transaction");
      }
      
      const result = await res.json();
      console.log('[AnnieFailedBookings] Success response:', result);
      
      toast.success("Annie Musical booking confirmed successfully");
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e: any) {
      console.error('[AnnieFailedBookings] Error in handleResolve:', e);
      toast.error(e.message || "Failed to resolve");
    } finally {
      setResolvingId(null);
    }
  };

  const isAnnieMusicalTransaction = (item: AnnieFailedBooking) => {
    return (
      (item.notes && (
        item.notes.includes('Annie Musical') || 
        item.notes.includes('annie-musical') || 
        item.notes.toLowerCase().includes('annie')
      )) ||
      (item.description && item.description.toLowerCase().includes('annie'))
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Annie Musical Failed Bookings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Payments confirmed but bookings not created for Annie Musical
              </p>
            </div>
            <Button variant="outline" onClick={fetchItems} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-gray-500">
                      {loading ? "Loading..." : "No Annie Musical failed bookings found"}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const u = item.user || item.userSnapshot || {};
                  
                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-mono text-xs">{item.paymentId || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.orderId || "-"}</TableCell>
                      <TableCell>
                        {item.amount != null ? `₹${item.amount}` : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{u.name || "Unknown"}</span>
                          <span className="text-xs text-gray-500">{u.email || "No email"}</span>
                          <span className="text-xs text-gray-500">{u.phone || "No phone"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-orange-600">Annie Musical</span>
                          <span className="text-xs text-gray-500">Musical Theatre Show</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Payment Confirmed</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => handleResolve(item._id)} 
                          disabled={resolvingId === item._id}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {resolvingId === item._id ? "Confirming..." : "Confirm Booking"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
