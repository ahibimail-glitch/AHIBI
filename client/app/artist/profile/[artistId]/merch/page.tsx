"use client"
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { SlidersHorizontal, ChevronDown, ShoppingBag } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./components/ProductCard";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

const categories = ["All", "Clothing", "Accessories", "Digital"];
const sortOptions = ["Popular", "Newest", "Price: Low", "Price: High"];
const CART_STORAGE_KEY = 'merch_cart';

interface MerchProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  variants: any[];
  images: string[];
  isDraft: boolean;
  createdAt: string;
  artist: {
    _id: string;
    name: string;
  };
}

export default function MerchStore() {
  const params = useParams();
  const artistId = params.artistId as string;
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("Popular");
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchProducts();
    updateCartCount();
  }, [artistId]);

  const updateCartCount = () => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      const cart = JSON.parse(savedCart);
      setCartCount(cart.length);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/hornbill-merch/products?artistId=${artistId}&isDraft=false`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "Newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "Price: Low") return a.price - b.price;
    if (sort === "Price: High") return b.price - a.price;
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header / Filters Bar */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Categories - Swipeable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Actions (Cart, Filters, Sort) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href={`/artist/profile/${artistId}/merch/cart`}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              aria-label="View Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-[22px] min-w-[22px] px-1 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground ring-2 ring-background">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" /> 
              <span>Filters</span>
            </button>

            <div className="relative flex-grow sm:flex-grow-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-border bg-card pl-4 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {sortOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:gap-8">
          {loading ? (
            <>
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </>
          ) : (
            sorted.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          )}
        </div>

        {/* Empty State */}
        {!loading && sorted.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-20 flex flex-col items-center justify-center text-center px-4"
          >
            <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
              <ShoppingBag className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-xl font-semibold text-foreground">No products found</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              We couldn't find any products in the <span className="font-medium text-foreground">"{activeCategory}"</span> category. Check back later or try a different filter.
            </p>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}