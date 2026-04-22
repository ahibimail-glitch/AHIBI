"use client"
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, X, ShoppingBag } from "lucide-react";
import { QuantityStepper } from "../components/QuantityStepper";
import { mockProducts } from "../data/mockProducts";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

interface CartItem {
  product: typeof mockProducts[0];
  size: string;
  color: string;
  quantity: number;
}

const initialCart: CartItem[] = [
  { product: mockProducts[0], size: "M", color: "Black", quantity: 1 },
  { product: mockProducts[2], size: "", color: "Gold", quantity: 2 },
];

export default function Cart() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;
  const [items, setItems] = useState(initialCart);

  const updateQty = (idx: number, qty: number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: qty } : item)));
  };

  const remove = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-background">
      <Navbar/>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </button>

        <h1 className="mt-4 text-2xl font-bold font-display text-foreground">Your Cart</h1>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16 flex flex-col items-center text-center"
          >
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-medium text-foreground">Your cart is empty</p>
            <Link
              href={`/artist/profile/${artistId}/merch`}
              className="mt-4 rounded-xl gradient-primary px-6 py-2.5 text-sm font-medium text-black"
            >
              Browse Store
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {items.map((item, idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{item.product.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[item.size, item.color].filter(Boolean).join(" / ")}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <QuantityStepper value={item.quantity} onChange={(q) => updateQty(idx, q)} />
                      <span className="text-sm font-semibold font-display text-foreground">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">
                  {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold font-display text-foreground">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3.5 text-sm font-medium text-black shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              Proceed to Checkout
            </button>
          </>
        )}
      </div>
      <Footer/>
    </div>
  );
}