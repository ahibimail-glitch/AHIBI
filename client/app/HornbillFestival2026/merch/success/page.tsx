"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Package, ShoppingBag, ArrowLeft, Loader2, Truck, Copy, Check, ExternalLink, Share2 } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [copied, setCopied] = useState(false);

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
                onClick={() => router.push("/HornbillFestival2026/merch")}
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

  const trackingOrderId = order?._id || order?.id || orderId;
  const trackingUrl = `https://hornbillmusicfestival.com/track/${trackingOrderId}`;

  const copyTrackingLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const shareOnWhatsApp = () => {
    const customerPhone = order?.shippingAddress?.phone?.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `Hello! Here is the order tracking link for Hornbill Festival Merchandise:\n\nOrder ID: ${trackingOrderId}\nLive Tracking: ${trackingUrl}\n\nPlease save this link to check shipping and AWB updates anytime without logging in.`
    );
    if (customerPhone && customerPhone.length >= 10) {
      const formatted = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;
      window.open(`https://wa.me/${formatted}?text=${msg}`, "_blank");
    } else {
      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 sm:py-12 px-3.5 sm:px-6 overflow-x-hidden">
        <div className="max-w-4xl mx-auto w-full">
          {/* Success / Status Header */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-3 sm:mb-4">
              <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 tracking-tight">
              {isPaid
                ? "Order Confirmed!"
                : isFailed
                  ? "Payment Failed"
                  : "Payment Processing"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-lg mx-auto">
              {isPaid && "Thank you for your purchase. We've received your order."}
              {isPending && !isPaid &&
                "Your payment is being processed. If this stays pending for a while, we'll notify you once it is confirmed."}
              {isFailed &&
                "We could not confirm your payment. If money was deducted, please contact at 8794696995 with your payment details."}
            </p>
            {isPolling && (
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                Waiting for payment confirmation from the bank...
              </p>
            )}
          </div>

          {/* Shareable Live Order Tracking Card */}
          <div className="mb-6 sm:mb-8 rounded-2xl border border-orange-500/30 bg-orange-500/10 dark:bg-orange-950/20 p-4 sm:p-6 shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5">
              <div className="space-y-1.5 w-full min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  <Truck className="h-4 w-4 shrink-0" />
                  <span>Live Order Tracking Link</span>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-foreground break-words">
                  Save this link for shipping & delivery updates
                </h3>

                <div className="pt-1.5 w-full overflow-hidden">
                  <span className="font-mono text-xs bg-background/90 text-foreground px-2.5 py-1.5 rounded-lg border block sm:inline-block break-all select-all">
                    {trackingUrl}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto shrink-0">
                <Button
                  onClick={copyTrackingLink}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 h-10 px-3 text-xs sm:text-sm"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "Copied Link!" : "Copy Link"}</span>
                </Button>
                <Button
                  onClick={() => window.open(trackingUrl, "_blank")}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2 h-10 px-3 text-xs sm:text-sm shadow-sm"
                >
                  <span>Track Order</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  onClick={shareOnWhatsApp}
                  variant="outline"
                  className="w-full text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950/30 flex items-center justify-center gap-2 h-10 px-3 text-xs sm:text-sm"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share via WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Order ID</p>
                  <p className="font-mono font-semibold text-xs sm:text-sm break-all">{order._id || order.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order Date</p>
                  <p className="text-xs sm:text-sm">
                    {new Date(order.createdAt || order.created_at).toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
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
                <CardTitle className="text-base sm:text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
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
                  <span>{formatCurrency(order.shipping || 0)}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-base sm:text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Items Ordered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl bg-card/60"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shrink-0 border"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base leading-snug break-words">{item.name}</h4>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground truncate">Variant: {item.variant}</p>
                        )}
                        {item.sku && (
                          <p className="text-xs text-muted-foreground truncate">SKU: {item.sku}</p>
                        )}
                        <div className="mt-1 sm:hidden">
                          <p className="font-semibold text-sm">
                            {formatCurrency((item.price || 0) * (item.quantity || 1))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} × {formatCurrency(item.price || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block shrink-0">
                        <p className="font-semibold">
                          {formatCurrency((item.price || 0) * (item.quantity || 1))}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
                  <CardTitle className="text-base sm:text-lg">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
                    <p className="font-semibold text-foreground text-sm sm:text-base">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && (
                      <p>{order.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                      {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    <p className="mt-2 text-muted-foreground font-medium">Phone: {order.shippingAddress.phone}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* CTA Section */}
          <div className="mt-8 text-center space-y-4">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-2xl p-5 sm:p-6 border">
              <p className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Shop more at Hornbill Merch Store</p>
              <p className="text-muted-foreground text-xs sm:text-sm mb-4 max-w-md mx-auto">
                Discover more amazing merchandise from the Hornbill Music Festival
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center items-stretch sm:items-center max-w-sm sm:max-w-none mx-auto">
                <Button
                  onClick={() => window.open("https://hornbillmusicfestival.com/merch", "_blank")}
                  className="w-full sm:w-auto h-11 px-6 font-medium"
                >
                  Continue Shopping
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="w-full sm:w-auto h-11 px-6 font-medium"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
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
