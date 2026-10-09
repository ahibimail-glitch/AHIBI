export interface ProductVariant {
  size?: string;
  color?: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Clothing" | "Accessories" | "Digital";
  images: string[];
  variants: ProductVariant[];
  stock: number;
  status: "published" | "draft";
  rating: number;
  reviews: number;
  createdAt: string;
  artistName: string;
  artistAvatar: string;
}

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Aurora Tour Tee",
    description: "Premium cotton tee featuring the Aurora World Tour 2025 design. Soft-touch fabric with a relaxed fit.",
    price: 34.99,
    category: "Clothing",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec515c5?w=600",
    ],
    variants: [
      { size: "S", color: "Black", stock: 12 },
      { size: "M", color: "Black", stock: 25 },
      { size: "L", color: "Black", stock: 18 },
      { size: "M", color: "White", stock: 15 },
      { size: "L", color: "White", stock: 8 },
    ],
    stock: 78,
    status: "published",
    rating: 4.8,
    reviews: 124,
    createdAt: "2025-01-15",
    artistName: "Luna Ray",
    artistAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
  {
    id: "2",
    name: "Vinyl Dreams Hoodie",
    description: "Heavyweight hoodie with embroidered logo. Fleece-lined for maximum comfort.",
    price: 64.99,
    category: "Clothing",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600",
      "https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=600",
    ],
    variants: [
      { size: "M", color: "Charcoal", stock: 10 },
      { size: "L", color: "Charcoal", stock: 6 },
      { size: "XL", color: "Charcoal", stock: 4 },
    ],
    stock: 20,
    status: "published",
    rating: 4.9,
    reviews: 87,
    createdAt: "2025-02-01",
    artistName: "Luna Ray",
    artistAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
  {
    id: "3",
    name: "Signature Enamel Pin Set",
    description: "Collectible set of 3 enamel pins featuring iconic album artwork.",
    price: 18.99,
    category: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1614680376408-81e91bbe261f?w=600",
    ],
    variants: [
      { color: "Gold", stock: 50 },
      { color: "Silver", stock: 35 },
    ],
    stock: 85,
    status: "published",
    rating: 4.6,
    reviews: 56,
    createdAt: "2025-03-10",
    artistName: "Luna Ray",
    artistAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
  {
    id: "4",
    name: "Digital Art Pack — Neon Series",
    description: "5 high-resolution digital artworks from the Neon Series. Perfect for wallpapers and prints.",
    price: 12.99,
    category: "Digital",
    images: [
      "https://images.unsplash.com/photo-1634017839464-5c339afa60f0?w=600",
    ],
    variants: [],
    stock: 999,
    status: "published",
    rating: 4.7,
    reviews: 203,
    createdAt: "2025-03-20",
    artistName: "Luna Ray",
    artistAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
  {
    id: "5",
    name: "Canvas Tote — Lyric Edition",
    description: "Organic canvas tote with screen-printed lyrics from the latest album.",
    price: 22.99,
    category: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600",
    ],
    variants: [
      { color: "Natural", stock: 30 },
      { color: "Black", stock: 22 },
    ],
    stock: 52,
    status: "draft",
    rating: 4.5,
    reviews: 18,
    createdAt: "2025-04-01",
    artistName: "Luna Ray",
    artistAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
  {
    id: "6",
    name: "Midnight Cap",
    description: "Structured cap with embroidered crescent moon logo. Adjustable strap.",
    price: 28.99,
    category: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600",
    ],
    variants: [
      { color: "Black", stock: 0 },
      { color: "Navy", stock: 14 },
    ],
    stock: 14,
    status: "published",
    rating: 4.4,
    reviews: 42,
    createdAt: "2025-04-05",
    artistName: "Luna Ray",
    artistAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
];