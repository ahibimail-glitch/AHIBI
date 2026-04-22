"use client"
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Star, ShoppingBag, Zap, Heart } from "lucide-react";
import { VariantSelector } from "../components/VariantSelector";
import { QuantityStepper } from "../components/QuantityStepper";
import { TagBadge } from "../components/TagBadge";
import { mockProducts } from "../data/mockProducts";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;
  const productID = params.productID as string;
  const product = mockProducts.find((p) => p.id === productID) || mockProducts[0];

  const availableSizes = [...new Set(product.variants.filter((v) => v.size).map((v) => v.size!))];
  const availableColors = [...new Set(product.variants.filter((v) => v.color).map((v) => v.color!))];

  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || "");
  const [selectedColor, setSelectedColor] = useState(availableColors[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="min-h-screen bg-background">
        <Navbar/>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </button>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={product.images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                      activeImage === i ? "border-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <TagBadge variant="new">New</TagBadge>
                <TagBadge variant="default">{product.category}</TagBadge>
              </div>
              <h1 className="mt-3 text-2xl font-bold font-display text-foreground sm:text-3xl">
                {product.name}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="text-sm font-medium">{product.rating}</span>
                </div>
                <span className="text-sm text-muted-foreground">({product.reviews} reviews)</span>
              </div>
              <p className="mt-4 text-2xl font-bold font-display text-foreground">
                ${product.price.toFixed(2)}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>

            {availableSizes.length > 0 && (
              <VariantSelector
                label="Size"
                options={availableSizes}
                selected={selectedSize}
                onSelect={setSelectedSize}
              />
            )}

            {availableColors.length > 0 && (
              <VariantSelector
                label="Color"
                options={availableColors}
                selected={selectedColor}
                onSelect={setSelectedColor}
              />
            )}

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Quantity</span>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>

            <div className="flex gap-3">
              <Link
                href={`/artist/profile/${artistId}/merch/cart`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl gradient-primary py-3.5 text-sm font-medium text-black shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </Link>
              <Link
                href={`/artist/profile/${artistId}/merch/cart`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/5 py-3.5 text-sm font-medium text-primary hover:bg-primary/10 active:scale-[0.98] transition-all"
              >
                <Zap className="h-4 w-4" /> Buy Now
              </Link>
              <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                <Heart className="h-4 w-4" />
              </button>
            </div>

            {/* Artist Mini Profile */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <img
                  src={product.artistAvatar}
                  alt={product.artistName}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{product.artistName}</p>
                  <p className="text-xs text-muted-foreground">Official Artist Store</p>
                </div>
              </div>
            </div>

            {/* Reviews Preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Recent Reviews</h3>
              {[1, 2].map((r) => (
                <div key={r} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < 4 ? "fill-warning text-warning" : "text-border"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Great quality, fits perfectly. Love the design!
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}