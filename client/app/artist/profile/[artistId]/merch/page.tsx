"use client"
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { SlidersHorizontal, ChevronDown, ShoppingBag } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./components/ProductCard";
import { mockProducts } from "./data/mockProducts";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

const categories = ["All", "Clothing", "Accessories", "Digital"];
const sortOptions = ["Popular", "Newest", "Price: Low", "Price: High"];

export default function MerchStore() {
  const params = useParams();
  const artistId = params.artistId as string;
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("Popular");
  const [showFilters, setShowFilters] = useState(false);

  const published = mockProducts.filter((p) => p.status === "published");
  const filtered =
    activeCategory === "All"
      ? published
      : published.filter((p) => p.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "Newest") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "Price: Low") return a.price - b.price;
    if (sort === "Price: High") return b.price - a.price;
    return b.reviews - a.reviews;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar/>
      <div className="mx-auto max-w-6xl px-4  sm:px-6">
      

        {/* Filters Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "gradient-primary text-black shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Link
              href={`/artist/profile/${artistId}/merch/cart`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors sm:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none rounded-xl border border-border bg-card px-4 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {sortOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {sorted.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16 text-center"
          >
            <p className="text-lg font-medium text-foreground">No products found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different category</p>
          </motion.div>
        )}
      </div>
      <Footer/>
    </div>
  );
}