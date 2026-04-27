"use client"
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TagBadge } from "./TagBadge";

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

export function ProductCard({ product }: { product: MerchProduct }) {
  const params = useParams();
  const artistId = params.artistId as string;
  
  // Calculate total stock across all variants
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  const isSoldOut = totalStock === 0;
  const isNew = new Date(product.createdAt) > new Date('2025-03-01');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group rounded-2xl border border-border bg-card shadow-soft overflow-hidden"
    >
      <Link href={`/artist/profile/${artistId}/merch/${product._id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {isSoldOut && <TagBadge variant="sold-out">Sold Out</TagBadge>}
            {isNew && !isSoldOut && (
              <TagBadge variant="new">New</TagBadge>
            )}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/artist/profile/${artistId}/merch/${product._id}`}>
          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-semibold font-display text-foreground">
            ₹{product.price.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Link 
              href={`/artist/profile/${artistId}/merch/${product._id}`}
              className="flex h-9 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-all"
            >
              View
            </Link>
            {!isSoldOut && (
              <Link href={`/artist/profile/${artistId}/merch/cart`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-md active:scale-95">
                <ShoppingBag className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 rounded bg-muted" />
          <div className="h-9 w-9 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}