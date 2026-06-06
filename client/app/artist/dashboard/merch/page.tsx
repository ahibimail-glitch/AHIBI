"use client"
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, X, Plus, Trash2 } from "lucide-react";
import { uploadToVercelBlob } from "@/lib/vercelBlob";

const categories = ["Clothing", "Accessories", "Digital", "Other"];
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
const colors = ["Black", "White", "Navy", "Charcoal", "Natural", "Red"];

interface Variant {
  size: string;
  color: string;
  stock: number;
  sku?: string;
}

interface VariantStock {
  size: string;
  color: string;
  stock: string;
}

interface MerchProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  variants: Variant[];
  images: string[];
  isDraft: boolean;
  createdAt: string;
}

interface MerchOrderItem {
  itemId?: string;
  variant?: string;
  quantity: number;
}

interface MerchOrder {
  status: "created" | "pending" | "paid" | "shipped" | "delivered" | "failed" | "cancelled" | "refunded";
  items: MerchOrderItem[];
}

export default function AddEditProduct() {
  const [images, setImages] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M", "L"]);
  const [selectedColors, setSelectedColors] = useState<string[]>(["Black"]);
  const [category, setCategory] = useState("Clothing");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [variantStocks, setVariantStocks] = useState<VariantStock[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [orders, setOrders] = useState<MerchOrder[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingProduct, setEditingProduct] = useState<MerchProduct | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch('/api/artist/merch/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch('/api/artist/merch/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setOrders(data.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const soldByCategory = useMemo(() => {
    const successfulStatuses = new Set(["paid", "shipped", "delivered"]);
    const productCategoryById = new Map(products.map((product) => [product._id, product.category]));
    const categoryMap = new Map<string, number>();

    for (const order of orders) {
      if (!successfulStatuses.has(order.status)) continue;

      for (const item of order.items || []) {
        const categoryName = item.itemId ? productCategoryById.get(item.itemId) : undefined;
        if (!categoryName) continue;

        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + qty);
      }
    }

    return categoryMap;
  }, [orders, products]);

  const soldByProductSize = useMemo(() => {
    const successfulStatuses = new Set(["paid", "shipped", "delivered"]);
    const productMap = new Map<string, Map<string, number>>();

    for (const order of orders) {
      if (!successfulStatuses.has(order.status)) continue;

      for (const item of order.items || []) {
        if (!item.itemId) continue;
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        const rawVariant = String(item.variant || "").trim();
        const size = rawVariant ? rawVariant.split("/")[0].trim() : "N/A";
        if (!size) continue;

        if (!productMap.has(item.itemId)) {
          productMap.set(item.itemId, new Map<string, number>());
        }
        const sizeMap = productMap.get(item.itemId)!;
        sizeMap.set(size, (sizeMap.get(size) || 0) + qty);
      }
    }

    return productMap;
  }, [orders]);

  const loadProductForEdit = (product: MerchProduct) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(product.price.toString());
    setCategory(product.category);
    setImages(product.images || []);
    setSelectedSizes([...new Set(product.variants?.map(v => v.size) || ["M", "L"])]);
    setSelectedColors([...new Set(product.variants?.map(v => v.color) || ["Black"])]);
    setVariantStocks(
      product.variants?.map(v => ({
        size: v.size,
        color: v.color,
        stock: v.stock.toString()
      })) || []
    );
    setViewMode('form');
  };

  const resetForm = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setPrice("");
    setImages([]);
    setSelectedSizes(["M", "L"]);
    setSelectedColors(["Black"]);
    setVariantStocks([]);
    setViewMode('list');
  };

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImage(true);
      const file = files[0];

      const uploadData = await uploadToVercelBlob(
        file,
        'merch',
        'image'
      );

      if (uploadData.url) {
        setImages([...images, uploadData.url]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const newVariantStocks: VariantStock[] = [];
    selectedSizes.forEach(size => {
      selectedColors.forEach(color => {
        const existing = variantStocks.find(v => v.size === size && v.color === color);
        newVariantStocks.push({
          size,
          color,
          stock: existing?.stock || "0"
        });
      });
    });
    setVariantStocks(newVariantStocks);
  }, [selectedSizes, selectedColors]);

  const updateVariantStock = (size: string, color: string, value: string) => {
    setVariantStocks(prev => 
      prev.map(v => 
        v.size === size && v.color === color 
          ? { ...v, stock: value } 
          : v
      )
    );
  };

  const generateVariants = (): Variant[] => {
    return variantStocks.map(vs => ({
      size: vs.size,
      color: vs.color,
      stock: parseInt(vs.stock) || 0,
      sku: `${name.replace(/\s+/g, '-').toLowerCase()}-${vs.size}-${vs.color.toLowerCase()}`
    }));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const variants = generateVariants();
      const token = localStorage.getItem('artist_token');
      
      const url = editingProduct 
        ? `/api/artist/merch/products/${editingProduct._id}`
        : '/api/artist/merch/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price) || 0,
          category,
          variants,
          images,
          isDraft
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: isDraft ? 'Product saved as draft' : 'Product published successfully' });
        // Refresh products
        fetchProducts();
        // Reset form and go back to list view
        resetForm();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save product' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save product. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch(`/api/artist/merch/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Product deleted successfully' });
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete product' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete product. Please try again.' });
    }
  };

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">Merch Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your merchandise products</p>
          </div>
          {viewMode === 'list' && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/artist/dashboard/merch/orders"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                View All Orders
              </Link>
              <button
                onClick={() => setViewMode('form')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add New Product
              </button>
            </div>
          )}
        </div>

        {viewMode === 'list' ? (
          /* Product List View */
          <div className="mt-8">
            {products.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No products yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first product</p>
                <button
                  onClick={() => setViewMode('form')}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Create Product
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  (() => {
                    const sizeMap = soldByProductSize.get(product._id) || new Map<string, number>();
                    const productSizes = [...new Set((product.variants || []).map((v) => v.size).filter(Boolean))];
                    const sizeSoldText =
                      productSizes.length > 0
                        ? productSizes.map((size) => `${size}: ${sizeMap.get(size) || 0}`).join(" · ")
                        : "N/A: 0";

                    return (
                  <div
                    key={product._id}
                    className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-square bg-muted">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                      {product.isDraft && (
                        <div className="absolute top-3 left-3 rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white">
                          Draft
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {product.category} · Sold {soldByCategory.get(product.category) || 0}
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{product.name}</h3>
                      <div className="mt-2 text-xl font-bold text-foreground">₹{product.price}</div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground">Sold by size: {sizeSoldText}</div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => loadProductForEdit(product)}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => window.open(`/artist/profile/${localStorage.getItem('artist_id')}/merch/${product._id}`, '_blank')}
                          className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => deleteProduct(product._id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Form View */
          <div>
            {editingProduct && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground min-w-0">
                  Editing: <span className="font-medium text-foreground">{editingProduct.name}</span>
                </span>
                <button
                  onClick={resetForm}
                  className="text-sm text-red-500 hover:text-red-600 border border-border rounded-lg px-2 py-1 w-full sm:w-auto"
                >
                  Cancel edit
                </button>
              </div>
            )}

            {message && (
              <div className={`mt-4 p-3 rounded-xl text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-8"
            >
              {/* Images */}
              <section className="space-y-3">
                <label className="text-sm font-medium text-foreground">Product Images</label>
                <div className="flex flex-wrap gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative h-28 w-28 rounded-2xl overflow-hidden border border-border bg-muted">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingImage ? (
                          <span className="text-xs">Uploading...</span>
                        ) : (
                          <>
                            <Upload className="h-5 w-5" />
                            <span className="text-xs">Upload</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </section>

              {/* Name & Description */}
              <section className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aurora Tour Tee"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your product..."
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>
              </section>

              {/* Price & Category */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full rounded-xl border border-border bg-card pl-8 pr-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Variants */}
              <section className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Variants</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Sizes</span>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => toggleItem(selectedSizes, s, setSelectedSizes)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                            selectedSizes.includes(s)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Colors</span>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <button
                          key={c}
                          onClick={() => toggleItem(selectedColors, c, setSelectedColors)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                            selectedColors.includes(c)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Variant Stock Table */}
                  {variantStocks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <span className="text-xs text-muted-foreground">Stock Quantity per Variant</span>
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Size</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Color</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variantStocks.map((vs, idx) => (
                              <tr key={idx} className="border-t border-border">
                                <td className="px-4 py-2 text-foreground">{vs.size}</td>
                                <td className="px-4 py-2 text-foreground">{vs.color}</td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={vs.stock}
                                    onChange={(e) => updateVariantStock(vs.size, vs.color, e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>

            {/* Sticky Save */}
            <div className="sticky bottom-0 mt-8 -mx-4 border-t border-border bg-background/80 backdrop-blur-lg px-4 py-4 sm:-mx-6 sm:px-6">
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save as Draft'}
                </button>
                <button 
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="rounded-xl gradient-primary px-6 py-2.5 text-sm font-medium text-primary shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Product'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}