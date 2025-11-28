"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Package, ShoppingBag, ArrowLeft } from "lucide-react";
import Navbar from "../../../Navbar";
import Footer from "../../../Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

function MerchOrderSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const accessToken = searchParams.get("accessToken");
  const razorpayPaymentLinkStatus = searchParams.get("razorpay_payment_link_status");
  const razorpayPaymentLinkId = searchParams.get("razorpay_payment_link_id");
  const razorpayPaymentId = searchParams.get("razorpay_payment_id");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is missing");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let pollAttempts = 0;
    let pollTimer: NodeJS.Timeout | null = null;

    const syncPaymentIfNeeded = async () => {
      try {
        if (razorpayPaymentLinkStatus === "paid" || razorpayPaymentId) {
          const body = {
            paymentLinkId: razorpayPaymentLinkId || undefined,
            paymentId: razorpayPaymentId || undefined,
            paymentStatus: razorpayPaymentLinkStatus || undefined,
          };
          await fetch(`/api/hornbill-merch/orders/${orderId}/sync-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
        }
      } catch {
        // ignore sync errors, we will still show whatever status we have
      }
    };

    const fetchOrder = async (isPoll = false) => {
      try {
        if (!isPoll) {
          setLoading(true);
        }
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const query = accessToken ? `?accessToken=${encodeURIComponent(accessToken)}` : "";
        const response = await fetch(`/api/hornbill-merch/orders/${orderId}${query}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch order details");
        }

        const data = await response.json();
        if (!cancelled) {
          setOrder(data.data);

          // If payment is still pending, poll a few times to allow webhook to update status
          const status = data.data?.status;
          if (status && status !== "paid" && pollAttempts < 5 && !isPoll) {
            setIsPolling(true);
            pollAttempts = 0;
            const startPolling = () => {
              pollTimer = setInterval(async () => {
                if (cancelled) return;
                pollAttempts += 1;
                try {
                  const pollResponse = await fetch(`/api/hornbill-merch/orders/${orderId}${query}`, {
                    headers: {
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                  });

                  if (!pollResponse.ok) return;
                  const pollData = await pollResponse.json();
                  const newStatus = pollData.data?.status;
                  setOrder(pollData.data);

                  if (!newStatus || newStatus === "paid" || pollAttempts >= 5) {
                    if (pollTimer) clearInterval(pollTimer);
                    setIsPolling(false);
                  }
                } catch {
                  // swallow polling errors
                }
              }, 4000);
            };

            startPolling();
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load order");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // First, try to sync payment status once using Razorpay callback params
    syncPaymentIfNeeded().finally(() => {
      fetchOrder();
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [orderId, accessToken, razorpayPaymentLinkStatus, razorpayPaymentLinkId, razorpayPaymentId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);

  if (loading && !order) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">Fetching your order details...</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <p className="text-center text-destructive">{error || "Order not found"}</p>
              <Button
                onClick={() => router.push("/HornbillFestival2025/merch")}
                className="w-full mt-4"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  const status = order.status || "pending";
  const isPaid = status === "paid";
  const isPending = status === "pending" || status === "created";
  const isFailed = status === "failed" || status === "cancelled";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Success / Status Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              {isPaid
                ? "Order Confirmed!"
                : isFailed
                ? "Payment Failed"
                : "Payment Processing"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isPaid && "Thank you for your purchase. We've received your order."}
              {isPending && !isPaid &&
                "Your payment is being processed. If this stays pending for a while, we'll notify you once it is confirmed."}
              {isFailed &&
                "We could not confirm your payment. If money was deducted, please contact at 8794696995 with your payment details."}
            </p>
            {isPolling && (
              <p className="mt-2 text-sm text-muted-foreground">
                Waiting for payment confirmation from the bank...
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Order Details */}
            <Card>
              <CardHeader> 
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-mono font-semibold">{order._id || order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p>
                    {new Date(order.createdAt || order.created_at).toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      isPaid ? "default" : isPending ? "secondary" : "destructive"
                    }
                    className="mt-1"
                  >
                    {status.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(order.tax || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {(order.shipping || 0) === 0 ? (
                      <span className="text-green-600 font-semibold">FREE</span>
                    ) : (
                      formatCurrency(order.shipping)
                    )}
                  </span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Items Ordered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        {item.variant && (
                          <p className="text-sm text-muted-foreground">Variant: {item.variant}</p>
                        )}
                        {item.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency((item.price || 0) * (item.quantity || 1))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × {formatCurrency(item.price || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-semibold">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && (
                      <p>{order.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                      {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    <p className="mt-2">Phone: {order.shippingAddress.phone}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* CTA Section */}
          <div className="mt-8 text-center space-y-4">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-6">
              <p className="text-lg font-semibold mb-2">Shop more at Hornbill Merch Store</p>
              <p className="text-muted-foreground mb-4">
                Discover more amazing merchandise from the Hornbill Festival
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => window.open("https://hornbillmusicfestival.com/merch", "_blank")}
                  size="lg"
                >
                  Continue Shopping
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              We'll send you tracking information once your order ships.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function MerchOrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MerchOrderSuccessInner />
    </Suspense>
  );
}

