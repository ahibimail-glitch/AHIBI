"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

type State = "checking" | "paid" | "pending" | "error";

function SuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const accessToken = searchParams.get("accessToken") || "";

  // Razorpay appends these to the callback_url on a payment link redirect.
  const paymentId = searchParams.get("razorpay_payment_id") || undefined;
  const paymentLinkId = searchParams.get("razorpay_payment_link_id") || undefined;
  const paymentStatus = searchParams.get("razorpay_payment_link_status") || undefined;

  const [state, setState] = useState<State>("checking");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    const reconcile = async () => {
      if (!orderId) {
        setState("error");
        setDetail("Missing order reference.");
        return;
      }
      try {
        const res = await fetch(
          `/api/hornbill-merch/orders/${encodeURIComponent(orderId)}/sync-payment`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentLinkId, paymentId, paymentStatus }),
          }
        );
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Could not confirm payment.");
        }
        const status = data.data?.status;
        if (status === "paid") {
          setState("paid");
        } else {
          setState("pending");
          setDetail(
            "Your payment is being confirmed. If you completed the payment, this will update shortly — you'll also receive an email confirmation."
          );
        }
      } catch (err: any) {
        setState("error");
        setDetail(err?.message || "Could not confirm payment.");
      }
    };
    reconcile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 text-center">
        {state === "checking" && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-sm">Confirming your payment…</p>
          </div>
        )}

        {state === "paid" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-14 w-14 text-green-600" />
            <h1 className="text-2xl font-bold font-display text-foreground">Payment successful</h1>
            <p className="text-sm text-muted-foreground">
              Your order has been placed. A confirmation email is on its way.
            </p>
            {orderId && (
              <p className="text-xs text-muted-foreground">Order reference: {orderId}</p>
            )}
            <Link
              href="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl gradient-primary px-6 py-3 text-sm font-medium shadow-sm hover:shadow-md transition-all"
            >
              Done
            </Link>
          </div>
        )}

        {state === "pending" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
            <h1 className="text-xl font-bold font-display text-foreground">Confirming payment</h1>
            <p className="text-sm text-muted-foreground">{detail}</p>
            {orderId && (
              <p className="text-xs text-muted-foreground">Order reference: {orderId}</p>
            )}
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold font-display text-foreground">We couldn't confirm your payment</h1>
            <p className="text-sm text-muted-foreground">{detail}</p>
            <p className="text-xs text-muted-foreground">
              If money was deducted, do not pay again — it will reconcile automatically or our team will reach out.
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
