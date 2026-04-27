"use client"
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Star, ShoppingBag, Zap, Heart } from "lucide-react";
import { VariantSelector } from "../components/VariantSelector";
import { QuantityStepper } from "../components/QuantityStepper";
import { TagBadge } from "../components/TagBadge";
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
  artist: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;
  const productID = params.productID as string;
  const [product, setProduct] = useState<MerchProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchProduct();
    updateCartCount();
  }, [productID]);

  const updateCartCount = () => {
    const savedCart = localStorage.getItem('merch_cart');
    if (savedCart) {
      const cart = JSON.parse(savedCart);
      setCartCount(cart.length);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/hornbill-merch/products/${productID}`);
      const data = await response.json();
      if (data.success && data.data) {
        setProduct(data.data);
        // Set default selections
        const availableSizes = [...new Set(data.data.variants?.map((v: any) => v.size) || [])];
        const availableColors = [...new Set(data.data.variants?.map((v: any) => v.color) || [])];
        if (availableSizes.length > 0) setSelectedSize(availableSizes[0] as string);
        if (availableColors.length > 0) setSelectedColor(availableColors[0] as string);
      } else {
        console.error('Invalid response structure:', data);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="animate-pulse">
            <div className="h-8 w-32 rounded bg-muted" />
            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="aspect-square rounded-2xl bg-muted" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-12 w-1/3 rounded bg-muted" />
                <div className="h-24 w-full rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-muted-foreground">Product not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const availableSizes = [...new Set(product.variants?.map((v) => v.size) || [])];
  const availableColors = [...new Set(product.variants?.map((v) => v.color) || [])];
  
  // Get stock for selected variant
  const selectedVariant = product.variants?.find(
    v => v.size === selectedSize && v.color === selectedColor
  );
  const availableStock = selectedVariant?.stock || 0;
  const isSoldOut = availableStock === 0;

  const CART_STORAGE_KEY = 'merch_cart';

  const addToCart = () => {
    if (!product) return;

    const cartItem = {
      product,
      size: selectedSize,
      color: selectedColor,
      quantity
    };

    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    const cart: typeof cartItem[] = savedCart ? JSON.parse(savedCart) : [];

    // Check if same product with same variants already exists
    const existingIndex = cart.findIndex(
      item => item.product._id === product._id && 
              item.size === selectedSize && 
              item.color === selectedColor
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  };

  const handleAddToCart = () => {
    addToCart();
    updateCartCount();
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart();
    updateCartCount();
    router.push(`/artist/profile/${artistId}/merch/cart`);
  };

  return (
    <div className="min-h-screen bg-background">
        <Navbar/>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Store
          </button>
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
        </div>

        {/* Added to Cart Toast */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showAddedToCart ? 1 : 0, y: showAddedToCart ? 0 : 20 }}
          className="fixed bottom-6 right-6 z-100"
        >
          <div className="flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-white shadow-lg">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm font-medium">Added to cart!</span>
          </div>
        </motion.div>

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
                {new Date(product.createdAt) > new Date('2025-03-01') && <TagBadge variant="new">New</TagBadge>}
                <TagBadge variant="default">{product.category}</TagBadge>
              </div>
              <h1 className="mt-3 text-2xl font-bold font-display text-foreground sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-4 text-2xl font-bold font-display text-foreground">
                ₹{product.price.toFixed(2)}
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
              <button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl gradient-primary py-3.5 text-sm font-medium text-black shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isSoldOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/5 py-3.5 text-sm font-medium text-primary hover:bg-primary/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="h-4 w-4" /> Buy Now
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                <Heart className="h-4 w-4" />
              </button>
            </div>

          

     
            
          </motion.div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}