"use client"
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TagBadge } from "./TagBadge";
import type { Product } from "../data/mockProducts";

export function ProductCard({ product }: { product: Product }) {
  const isSoldOut = product.stock === 0;
  const params = useParams();
  const artistId = params.artistId as string;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group rounded-2xl border border-border bg-card shadow-soft overflow-hidden"
    >
      <Link href={`/artist/profile/${artistId}/merch/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex gap-1.5">
            {isSoldOut && <TagBadge variant="sold-out">Sold Out</TagBadge>}
            {product.createdAt > "2025-03-01" && !isSoldOut && (
              <TagBadge variant="new">New</TagBadge>
            )}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/artist/profile/${artistId}/merch/${product.id}`}>
          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-semibold font-display text-foreground">
            ${product.price.toFixed(2)}
          </span>
          {!isSoldOut && (
            <Link href={`/artist/profile/${artistId}/merch/cart`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-md active:scale-95">
              <ShoppingBag className="h-4 w-4" />
            </Link>
          )}
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