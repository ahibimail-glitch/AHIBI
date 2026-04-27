"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  Calendar,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface Booking {
  _id: string;
  event: {
    name: string;
    date: string;
  };
  amount: number;
  status: string;
  paymentStatus: string;
  organizer: {
    name: string;
  };
}

interface EarningsData {
  statistics: {
    totalEarnings: number;
    pendingEarnings: number;
    thisMonthEarnings: number;
    totalBookings: number;
    paidBookings: number;
  };
  bookings: Booking[];
  period: string;
}

export default function EarningsPage() {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("artist_token");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/artist/earnings?period=${period}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setEarningsData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Earnings & Payouts</h2>
          <p className="text-muted-foreground">Track your income and payment history</p>
        </div>
        <div className="flex gap-2">
          {["this_month", "last_month", "this_year", "all"].map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p.replace("_", " ").toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : earningsData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(earningsData.statistics.thisMonthEarnings)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <p className="text-3xl font-bold text-orange-600">
                    {formatCurrency(earningsData.statistics.pendingEarnings)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(earningsData.statistics.totalEarnings)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Earnings</CardTitle>
              <CardDescription>
                {earningsData.statistics.totalBookings} bookings •{" "}
                {earningsData.statistics.paidBookings} paid
              </CardDescription>
            </CardHeader>
            <CardContent>
              {earningsData.bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No earnings data available for this period
                </div>
              ) : (
                <div className="space-y-4">
                  {earningsData.bookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{booking.event.name}</h4>
                          <Badge
                            variant={
                              booking.paymentStatus === "fully_paid"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {booking.paymentStatus === "fully_paid" ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Paid
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(booking.event.date)}
                          </span>
                          <span>by {booking.organizer.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {formatCurrency(booking.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load earnings data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
