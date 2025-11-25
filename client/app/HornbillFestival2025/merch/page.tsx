"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  LogIn,
  Package,
  ShieldCheck,
  ShoppingBag,
  Truck
} from "lucide-react";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";

type CartItem = {
  id: string;
  name: string;
  sku?: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
  taxRate?: number;
};

type CartResponse = {
  items: CartItem[];
  currency: string;
  notes?: string;
};

type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type ValidationErrors = Partial<Record<keyof ShippingAddress, string>>;

const TAX_RATE = 0;
const FREE_SHIPPING_THRESHOLD = 3000;
const STANDARD_SHIPPING_FEE =0;

const formatCurrency = (value: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency
  }).format(value);

const MerchCheckoutInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const { user, isAuthenticated, loading: authLoading } = useAuth({
    redirectPath: ""
  });

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addressTouched, setAddressTouched] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India"
  });

  const [addressErrors, setAddressErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (user && !addressTouched) {
      setShippingAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        phone: prev.phone || user.phone || ""
      }));
    }
  }, [user, addressTouched]);

  useEffect(() => {
    if (!sessionId) {
      setCartError("Missing session information. Please return from Hornbill merch store.");
      setCartLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCart = async () => {
      try {
        setCartLoading(true);
        setCartError(null);

        const response = await fetch(`/api/hornbill-merch/cart/session/${sessionId}`, {
          method: "GET",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Unable to load your Hornbill cart. Please retry.");
        }

        const payload = await response.json();
        const normalized = normalizeCartResponse(payload);
        setCart(normalized);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
        setCartError(
          error instanceof Error ? error.message : "Failed to fetch cart details."
        );
      } finally {
        setCartLoading(false);
      }
    };

    fetchCart();

    return () => controller.abort();
  }, [sessionId, refreshKey]);

  const orderSummary = useMemo(() => {
    if (!cart) {
      return { subtotal: 0, tax: 0, shipping: 0, total: 0, itemCount: 0 };
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = cart.items.reduce((sum, item) => {
      const lineTaxRate = item.taxRate ?? TAX_RATE;
      return sum + item.price * item.quantity * lineTaxRate;
    }, 0);
    const shipping =
      subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0
        ? 0
        : STANDARD_SHIPPING_FEE;
    const total = subtotal + tax + shipping;
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, tax, shipping, total, itemCount };
  }, [cart]);

  const normalizeCartResponse = (payload: any): CartResponse => {
    const data = payload?.data || payload?.cart || payload;
    const normalizedItems: CartItem[] = (data?.items || data?.cartItems || []).map(
      (item: any, index: number) => ({
        id: item.id || item.itemId || `line-${index}`,
        name: item.name || item.title || "Merch item",
        sku: item.sku,
        variant: item.variant || item.option,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price ?? item.unitPrice ?? item.amount ?? 0),
        image: item.image || item.thumbnail,
        taxRate:
          typeof item.taxRate === "number" ? item.taxRate : item.tax_rate ?? undefined
      })
    );

    return {
      items: normalizedItems,
      currency: data?.currency || "INR",
      notes: data?.notes
    };
  };

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setAddressTouched(true);
    setShippingAddress((prev) => ({
      ...prev,
      [field]: value
    }));

    if (addressErrors[field]) {
      setAddressErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateShippingAddress = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!shippingAddress.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!shippingAddress.phone.trim()) {
      errors.phone = "Contact number is required";
    } else if (!/^\+?[0-9]{10,15}$/.test(shippingAddress.phone.trim())) {
      errors.phone = "Enter a valid phone number";
    }
    if (!shippingAddress.addressLine1.trim()) {
      errors.addressLine1 = "Address line is required";
    }
    if (!shippingAddress.city.trim()) {
      errors.city = "City is required";
    }
    if (!shippingAddress.state.trim()) {
      errors.state = "State / Province is required";
    }
    if (!shippingAddress.postalCode.trim()) {
      errors.postalCode = "PIN / ZIP code is required";
    }
    if (!shippingAddress.country.trim()) {
      errors.country = "Country is required";
    }

    return errors;
  };

  const handlePlaceOrder = async () => {
    if (!sessionId) {
      toast.error("Missing cart session. Please restart from Hornbill merch.");
      return;
    }

    if (!cart || cart.items.length === 0) {
      toast.error("No items to checkout.");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please log in to continue checkout.");
      router.push(
        createAuthRedirectUrl(`/HornbillFestival2025/merchcheckout?session=${sessionId}`)
      );
      return;
    }

    const validationErrors = validateShippingAddress();
    if (Object.keys(validationErrors).length) {
      setAddressErrors(validationErrors);
      toast.error("Please complete your shipping address.");
      return;
    }

    try {
      setIsPlacingOrder(true);
      setSubmitError(null);

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const response = await fetch("/api/hornbill-merch/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sessionId,
          items: cart.items,
          totals: orderSummary,
          shippingAddress,
          source: "hornbill-merch",
          metadata: {
            linkedSession: sessionId,
            userId: user?.id,
            cartNotes: cart.notes
          }
        })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.message ||
            "Unable to create order. Please try again or contact support."
        );
      }

      const data = await response.json();
      toast.success("Order created. Redirecting to payment...");

      const paymentUrl =
        data?.data?.paymentLink ||
        data?.data?.payment_url ||
        data?.paymentUrl ||
        data?.payment_url;

      const orderId =
        data?.data?.orderId || data?.orderId || data?.data?.id || data?.id;

      if (paymentUrl) {
        router.push(paymentUrl);
        return;
      }

      if (orderId) {
        router.push(`/payments/processing?orderId=${orderId}`);
        return;
      }

      toast.info("Order placed. We will update you once payment is confirmed.");
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to initiate payment.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleRetry = () => {
    setRefreshKey((key) => key + 1);
  };

  const renderCartContent = () => {
    if (cartLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          Fetching your Hornbill cart...
        </div>
      );
    }

    if (cartError) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <p className="text-lg font-semibold text-foreground">Cart unavailable</p>
            <p className="text-sm text-muted-foreground">{cartError}</p>
          </div>
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      );
    }

    if (!cart || cart.items.length === 0) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/60 p-10 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold">No merch in cart</p>
            <p className="text-sm text-muted-foreground">
              Return to the Hornbill merch store to add items, then try again.
            </p>
          </div>
          <Button onClick={() => router.push("https://hornbillmusicfestival.com/merch")}>
            Browse Hornbill Merch
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm"
          >
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-foreground">{item.name}</p>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(item.price * item.quantity, cart.currency)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Qty {item.quantity}
                {item.variant ? ` • ${item.variant}` : ""}
                {item.sku ? ` • SKU ${item.sku}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.price, cart.currency)} each
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
  
      <main className="container mx-auto px-4 py-8">
        {/* --- PAGE TITLE --- */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Hornbill Merchandise Checkout</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review your cart, add shipping details, and complete payment securely.
          </p>
        </div>
  
        {/* --- GRID LAYOUT --- */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
  
          {/* ---------------- LEFT SIDE ---------------- */}
          <div className="space-y-8">
            
            {/* CART ITEMS */}
            <div className="rounded-xl border p-6 bg-card">
              <h2 className="text-lg font-semibold mb-4">Your Cart</h2>
              {renderCartContent()}
            </div>
  
            {/* LOGIN */}
            <div className="rounded-xl border p-6 bg-card">
              <h2 className="text-lg font-semibold mb-4">User Details</h2>
  
              {authLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking session...
                </div>
              ) : isAuthenticated && user ? (
                <div className="rounded-md border p-4 bg-muted/40">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    You must be logged in to complete checkout.
                  </p>
                  <Button
                    onClick={() =>
                      router.push(
                        createAuthRedirectUrl(
                          `/HornbillFestival2025/merchcheckout?session=${sessionId ?? ""}`
                        )
                      )
                    }
                  >
                    Login to Continue
                  </Button>
                </div>
              )}
            </div>
  
            {/* SHIPPING */}
            <div className="rounded-xl border p-6 bg-card">
              <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
  
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={shippingAddress.fullName}
                    onChange={(e) => handleAddressChange("fullName", e.target.value)}
                  />
                  {addressErrors.fullName && (
                    <p className="text-xs text-destructive">{addressErrors.fullName}</p>
                  )}
                </div>
  
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={shippingAddress.phone}
                    onChange={(e) => handleAddressChange("phone", e.target.value)}
                  />
                  {addressErrors.phone && (
                    <p className="text-xs text-destructive">{addressErrors.phone}</p>
                  )}
                </div>
  
                <div className="space-y-2 md:col-span-2">
                  <Label>Address Line 1</Label>
                  <Textarea
                    value={shippingAddress.addressLine1}
                    onChange={(e) =>
                      handleAddressChange("addressLine1", e.target.value)
                    }
                  />
                  {addressErrors.addressLine1 && (
                    <p className="text-xs text-destructive">{addressErrors.addressLine1}</p>
                  )}
                </div>
  
                <div className="space-y-2 md:col-span-2">
                  <Label>Address Line 2</Label>
                  <Input
                    value={shippingAddress.addressLine2}
                    onChange={(e) =>
                      handleAddressChange("addressLine2", e.target.value)
                    }
                  />
                </div>
  
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={shippingAddress.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                  />
                  {addressErrors.city && (
                    <p className="text-xs text-destructive">{addressErrors.city}</p>
                  )}
                </div>
  
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={shippingAddress.state}
                    onChange={(e) => handleAddressChange("state", e.target.value)}
                  />
                  {addressErrors.state && (
                    <p className="text-xs text-destructive">{addressErrors.state}</p>
                  )}
                </div>
  
                <div className="space-y-2">
                  <Label>PIN</Label>
                  <Input
                    value={shippingAddress.postalCode}
                    onChange={(e) =>
                      handleAddressChange("postalCode", e.target.value)
                    }
                  />
                  {addressErrors.postalCode && (
                    <p className="text-xs text-destructive">{addressErrors.postalCode}</p>
                  )}
                </div>
  
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={shippingAddress.country}
                    onChange={(e) => handleAddressChange("country", e.target.value)}
                  />
                </div>
              </div>
            </div>
  
          </div>
  
          {/* ---------------- RIGHT SIDE ---------------- */}
          <div className="rounded-xl border p-6 bg-card space-y-4 shadow-md h-fit">
            <h2 className="text-lg font-semibold">Order Summary</h2>
  
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(orderSummary.subtotal)}</span>
              </div>
  
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(orderSummary.tax)}</span>
              </div>
  
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {orderSummary.shipping === 0
                    ? "Free"
                    : formatCurrency(orderSummary.shipping)}
                </span>
              </div>
            </div>
  
            <div className="border-t pt-3 font-semibold flex justify-between">
              <span>Total</span>
              <span>{formatCurrency(orderSummary.total)}</span>
            </div>
  
            <Button
              className="w-full mt-3"
              disabled={!cart || !cart.items.length || isPlacingOrder}
              onClick={handlePlaceOrder}
            >
              {isPlacingOrder ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Pay & Confirm Order"
              )}
            </Button>
  
         
          </div>
  
        </div>
      </main>
  
      <Footer />
    </div>
  );
};

const MerchCheckoutPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MerchCheckoutInner />
    </Suspense>
  );
};

export default MerchCheckoutPage;