"use client"
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Script from "next/script";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

interface MerchProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  variants: {
    size: string;
    color: string;
    stock: number;
  }[];
  images: string[];
  isDraft: boolean;
  createdAt: string;
}

interface CartItem {
  product: MerchProduct;
  size: string;
  color: string;
  quantity: number;
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

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CART_STORAGE_KEY = 'merch_cart';

export default function Checkout() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;
  const [items, setItems] = useState<CartItem[]>([]);
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
    loadCart();
  }, []);

  const loadCart = () => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal;

  const updateShippingField = (field: keyof ShippingAddress, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const validateDeliveryDetails = () => {
    if (!shipping.fullName.trim()) return "Full name is required";
    if (!shipping.email.trim()) return "Email is required";
    if (!shipping.phone.trim()) return "Phone number is required";
    if (!/^\+?[0-9]{10,15}$/.test(shipping.phone.trim())) return "Enter a valid phone number";
    if (!shipping.addressLine1.trim()) return "Address line 1 is required";
    if (!shipping.city.trim()) return "City is required";
    if (!shipping.state.trim()) return "State is required";
    if (!shipping.postalCode.trim()) return "Postal code is required";
    if (!shipping.country.trim()) return "Country is required";
    return null;
  };

  const loadRazorpayScript = async () => {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
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

      const token = localStorage.getItem("token");
      if (!token) {
        const checkoutUrl = `/artist/profile/${artistId}/merch/cart/checkout`;
        router.push(`/auth?redirect=${encodeURIComponent(checkoutUrl)}`);
        return;
      }

      setIsSubmitting(true);

      const checkoutResponse = await fetch("/api/hornbill-merch/orders/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product._id,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          shippingAddress: {
            ...shipping,
            phone: shipping.phone.trim(),
          },
          source: "artist-merch",
          metadata: {
            artistId,
          },
        }),
      });

      const checkoutData = await checkoutResponse.json();
      if (!checkoutResponse.ok || !checkoutData?.success) {
        throw new Error(checkoutData?.message || "Failed to create checkout order");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: checkoutData.data.razorpayOrder.amount,
        currency: checkoutData.data.razorpayOrder.currency,
        name: "Ahibi Merch",
        description: "Merchandise Checkout",
        order_id: checkoutData.data.razorpayOrder.id,
        prefill: {
          name: shipping.fullName,
          email: shipping.email,
          contact: shipping.phone,
        },
        theme: {
          color: "#111827",
        },
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch("/api/hornbill-merch/orders/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                merchOrderId: checkoutData.data.merchOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyData?.success) {
              throw new Error(verifyData?.message || "Payment verification failed");
            }

            localStorage.removeItem(CART_STORAGE_KEY);
            setItems([]);
            setMessage({ type: "success", text: "Payment successful. Your order has been placed." });
            router.push(`/artist/profile/${artistId}/merch`);
          } catch (error: any) {
            setMessage({ type: "error", text: error?.message || "Payment verification failed." });
          } finally {
            setIsSubmitting(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", () => {
        setMessage({ type: "error", text: "Payment failed. Please try again." });
        setIsSubmitting(false);
      });
      razorpay.open();
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Unable to process payment." });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar/>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href={`/artist/profile/${artistId}/merch/cart`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Link>

        <h1 className="mt-4 text-2xl font-bold font-display text-foreground">Checkout</h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-8"
        >
          {/* Shipping */}
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

        

          {/* Order Items */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Order Items</h2>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{item.product.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" / ")} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold font-display text-foreground">
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Order Summary */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-lg font-bold font-display text-foreground">₹{total.toFixed(2)}</span>
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
            <Lock className="h-4 w-4" /> Place Order — ₹{total.toFixed(2)}
          </button>
        </motion.div>
      </div>
      <Footer/>
    </div>
  );
}