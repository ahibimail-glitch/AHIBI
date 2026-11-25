"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

const DEFAULT_SOURCE = "nagaland-tourism";

const STORE_URL = "https://tourism.nagaland.gov.in/hornbill-merchandise/";

const POLICIES = [
  { label: "Shipping Policy", href: "https://tourism.nagaland.gov.in/hornbill-store-shipping-policy/" },
  { label: "Return & Refund Policy", href: "https://tourism.nagaland.gov.in/hornbill-store-return-policy/" },
  { label: "Privacy Policy", href: "https://tourism.nagaland.gov.in/hornbill-store-privacy-policy/" },
  { label: "Terms & Conditions", href: "https://tourism.nagaland.gov.in/hornbill-store-terms/" },
  { label: "Seller & Grievance Details", href: "https://tourism.nagaland.gov.in/hornbill-store-seller-details/" },
];

interface CartItem {
  itemId: string;
  name: string;
  sku?: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Totals {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function TourismCheckout() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("sessionId") || "";
  const source = searchParams.get("source") || DEFAULT_SOURCE;

  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [currency, setCurrency] = useState("INR");
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [shipping, setShipping] = useState<ShippingAddress>({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  useEffect(() => {
    const loadCart = async () => {
      if (!sessionId) {
        setCartError("Missing cart reference (sessionId). Please return to the store and try again.");
        setLoadingCart(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/hornbill-merch/cart/session/${encodeURIComponent(sessionId)}?source=${encodeURIComponent(source)}`
        );
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Unable to load your cart.");
        }
        setItems(data.data.items || []);
        setTotals(data.data.totals || null);
        setCurrency(data.data.currency || "INR");
      } catch (err: any) {
        setCartError(err?.message || "Unable to load your cart.");
      } finally {
        setLoadingCart(false);
      }
    };
    loadCart();
  }, [sessionId, source]);

  const fallbackSubtotal = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0),
    [items]
  );
  const displayTotal = totals?.total ?? fallbackSubtotal;

  const updateShippingField = (field: keyof ShippingAddress, value: string) =>
    setShipping((prev) => ({ ...prev, [field]: value }));

  const validateDeliveryDetails = () => {
    if (!shipping.fullName.trim()) return "Full name is required";
    if (!shipping.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email.trim())) return "Enter a valid email";
    if (!shipping.phone.trim()) return "Phone number is required";
    if (!/^\+?[0-9]{10,15}$/.test(shipping.phone.trim())) return "Enter a valid phone number";
    if (!shipping.addressLine1.trim()) return "Address line 1 is required";
    if (!shipping.city.trim()) return "City is required";
    if (!shipping.state.trim()) return "State is required";
    if (!shipping.postalCode.trim()) return "Postal code is required";
    if (!shipping.country.trim()) return "Country is required";
    return null;
  };

  const startPayment = async () => {
    try {
      setMessage(null);

      if (!items.length) {
        setMessage({ type: "error", text: "Your cart is empty." });
        return;
      }

      const validationError = validateDeliveryDetails();
      if (validationError) {
        setMessage({ type: "error", text: validationError });
        return;
      }

      // Login gate — the user authenticates on AHIBI here, so no cross-site
      // token handoff is required from the partner site.
      const token = localStorage.getItem("token");
      if (!token) {
        const returnUrl = `${pathname}?sessionId=${encodeURIComponent(sessionId)}&source=${encodeURIComponent(source)}`;
        router.push(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
        return;
      }

      setIsSubmitting(true);

      const res = await fetch("/api/hornbill-merch/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          source,
          shippingAddress: { ...shipping, phone: shipping.phone.trim() },
          metadata: { source },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to start checkout.");
      }

      const paymentLink = data.data?.paymentLink;
      if (!paymentLink) {
        throw new Error("Payment link was not returned. Please try again.");
      }

      // Redirect to the Razorpay hosted payment page.
      window.location.href = paymentLink;
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Unable to process payment." });
      setIsSubmitting(false);
    }
  };

  const money = (n: number) => `₹${(Number(n) || 0).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <a
          href={STORE_URL}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to store
        </a>

        <h1 className="mt-4 text-2xl font-bold font-display text-foreground">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">Secure payment powered by AHIBI</p>

        {loadingCart ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading your cart…</span>
          </div>
        ) : cartError ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {cartError}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-8"
          >
            {/* Order Items */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Your Items</h2>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.itemId || idx} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted" />
                    )}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{item.name}</h3>
                        {item.variant && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.variant}</p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">Qty × {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold font-display text-foreground">
                        {money(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Delivery Details */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Delivery Details</h2>
              <input
                value={shipping.fullName}
                onChange={(e) => updateShippingField("fullName", e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="email"
                  value={shipping.email}
                  onChange={(e) => updateShippingField("email", e.target.value)}
                  placeholder="Email address"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <input
                  value={shipping.phone}
                  onChange={(e) => updateShippingField("phone", e.target.value)}
                  placeholder="Phone number"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <input
                value={shipping.addressLine1}
                onChange={(e) => updateShippingField("addressLine1", e.target.value)}
                placeholder="Address line 1"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <input
                value={shipping.addressLine2}
                onChange={(e) => updateShippingField("addressLine2", e.target.value)}
                placeholder="Address line 2 (optional)"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  value={shipping.city}
                  onChange={(e) => updateShippingField("city", e.target.value)}
                  placeholder="City"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <input
                  value={shipping.state}
                  onChange={(e) => updateShippingField("state", e.target.value)}
                  placeholder="State"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <input
                  value={shipping.postalCode}
                  onChange={(e) => updateShippingField("postalCode", e.target.value)}
                  placeholder="Postal code"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <input
                value={shipping.country}
                onChange={(e) => updateShippingField("country", e.target.value)}
                placeholder="Country"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </section>

            {/* Order Summary */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
              {totals && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">{money(totals.subtotal)}</span>
                  </div>
                  {totals.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium text-foreground">{money(totals.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-foreground">
                      {totals.shipping > 0 ? money(totals.shipping) : "Free"}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold font-display text-foreground">{money(displayTotal)}</span>
              </div>
            </section>

            {message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              onClick={startPayment}
              disabled={isSubmitting || !items.length}
              className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-4 text-sm font-medium shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {isSubmitting ? "Starting payment…" : `Pay ${money(displayTotal)}`}
            </button>

            <div className="pt-1 text-center text-xs text-muted-foreground">
              <p className="mb-1.5">By paying you agree to the store policies:</p>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                {POLICIES.map((policy) => (
                  <a
                    key={policy.href}
                    href={policy.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {policy.label}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
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
      <TourismCheckout />
    </Suspense>
  );
}
