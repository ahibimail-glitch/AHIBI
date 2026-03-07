"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type TxItem = {
  _id: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: string;
  user?: { name?: string; email?: string; phone?: string } | null;
  userSnapshot?: { name?: string; email?: string; phone?: string } | null;
  event?: { title?: string; startDate?: string } | null;
  bookingDetails?: any;
};

type LivestreamPurchaseItem = {
  _id: string;
  status?: string;
  accessGranted?: boolean;
  user?: { _id?: string; email?: string; phone?: string } | null;
};

const TARGET_LIVESTREAM_ID = "699f410d5797a2d4ead1e556";

export default function NWAFailedPayments() {
  const [items, setItems] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [livestreamStatusByUser, setLivestreamStatusByUser] = useState<Record<string, { status: string; accessGranted: boolean }>>({});

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("admin_token") || "";
  }, []);

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", []);

  const getUserKeys = (user?: { _id?: string; email?: string; phone?: string } | null) => {
    if (!user) return [] as string[];

    return [user._id, user.email?.toLowerCase(), user.phone]
      .filter((value): value is string => Boolean(value));
  };

  const fetchLivestreamStatuses = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/livestream/admin/purchases?livestreamId=${TARGET_LIVESTREAM_ID}&limit=200`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch livestream purchase statuses");

      const json = await res.json();
      const purchases: LivestreamPurchaseItem[] = json.data || [];
      const statusMap: Record<string, { status: string; accessGranted: boolean }> = {};

      purchases.forEach((purchase) => {
        const keys = getUserKeys(purchase.user);
        keys.forEach((key) => {
          statusMap[key] = {
            status: purchase.status || "unknown",
            accessGranted: Boolean(purchase.accessGranted),
          };
        });
      });

      setLivestreamStatusByUser(statusMap);
    } catch (e: any) {
      toast.error(e.message || "Failed to load livestream statuses");
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/payments/paid-no-booking`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch failed payments");
      const json = await res.json();
      const filteredItems = (json.data?.items || []).filter((item: TxItem) => Number(item.amount) === 199);
      setItems(filteredItems);
    } catch (e: any) {
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchLivestreamStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      console.log('[FailedPayments] Attempting to resolve transaction:', id);
      
      const res = await fetch(`${apiUrl}/api/admin/payments/resolve/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      
      console.log('[FailedPayments] Response status:', res.status);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[FailedPayments] Error response:', err);
        throw new Error(err.message || "Failed to resolve transaction");
      }
      
      const result = await res.json();
      console.log('[FailedPayments] Success response:', result);
      
      toast.success("Booking confirmed successfully");
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e: any) {
      console.error('[FailedPayments] Error in handleResolve:', e);
      toast.error(e.message || "Failed to resolve");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Paid but Not Booked</h2>
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
                  <TableHead>Livestream Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-gray-500">
                      {loading ? "Loading..." : "No records found"}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const u = item.user || item.userSnapshot || {};
                  const livestreamMatch = getUserKeys(u).map((key) => livestreamStatusByUser[key]).find(Boolean);
                  const eventTitle = item.event?.title || 
                                   item.bookingDetails?.event?.title || 
                                   (item.bookingDetails?.event ? 'Event ID: ' + item.bookingDetails.event._id : '-');
                  
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
                          <span className="font-medium">{eventTitle}</span>
                          {item.event?.startDate && (
                            <span className="text-xs text-gray-500">
                              {new Date(item.event.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={livestreamMatch?.accessGranted ? "default" : "secondary"}>
                          {livestreamMatch
                            ? `${livestreamMatch.status.replace(/_/g, " ")} - ${livestreamMatch.accessGranted ? "access granted" : "no access"}`
                            : "not purchased"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleResolve(item._id)} disabled={resolvingId === item._id}>
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


