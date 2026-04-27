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
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
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