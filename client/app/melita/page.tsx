
"use client"
import React, { useState } from 'react';
import { Star, ShoppingBag, Heart, User, Search } from 'lucide-react';
import Footer from '../Footer';
import Navbar from '../Navbar';

const MelitaProductsPage = () => {
    const [favorites, setFavorites] = useState(new Set());
    const [cart, setCart] = useState([]);

    const products = [
        {
            id: 1,
            name: "Melita Oily Skin Daily Essentials",
            category: "SKINCARE KIT",
            price: 2593,
            originalPrice: 3324,
            rating: 4.71,
            reviews: 7,
            image: "/path/to/oily-skin-daily-essentials.jpg",
            description: "3-step routine: Cleanser → Essence → Sunscreen. Designed for oily/acne-prone skin.",
            highlights: [
                "Removes excess oil without stripping",
                "Hydrates without clogging pores",
                "Soothes breakouts",
                "Protects against sun, screen & pollution"
            ]
        },
        {
            id: 2,
            name: "Melita Barrier Care Starter Duo",
            category: "SKINCARE KIT",
            price: 1499,
            originalPrice: 1874,
            rating: 4.5,
            reviews: 2,
            image: "/path/to/barrier-care-starter-duo.jpg",
            description: "2-step routine: Cleanser → Essence. Resets skin and supports long-term health.",
            highlights: [
                "Cleanses without stripping",
                "Boosts hydration by up to 400%",
                "Strengthens skin barrier",
                "Soothes irritated skin"
            ]
        },
        {
            id: 3,
            name: "Melita Ultra Protecting Sunscreen",
            category: "SUNSCREEN",
            price: 1299,
            originalPrice: 1450,
            rating: 5,
            reviews: 4,
            image: "/path/to/ultra-protecting-sunscreen.jpg",
            description: "SPF 50+ PA++++, broad-spectrum. Gel-cream, lightweight, no white cast.",
            highlights: [
                "Stable broad sun protection",
                "Fights free radicals and pigmentation",
                "Gentle and soothing",
                "Advanced UV filters, Niacinamide, Hyaluronic Acid, Ceramides"
            ]
        },
        {
            id: 4,
            name: "Melita Ultra Hydrating Essence",
            category: "ESSENCE",
            price: 1199,
            originalPrice: 1499,
            rating: 4.88,
            reviews: 56,
            image: "/path/to/ultra-hydrating-essence.jpg",
            description: "Featherlight essence with Squalane, Hyaluronic Acid, Peptides. Boosts hydration by 400%, strengthens skin barrier.",
            highlights: [
                "Deep hydration",
                "Barrier reinforcement",
                "Antioxidant defense",
                "Gentle exfoliation"
            ]
        }
    ];


    const toggleFavorite = (productId: number) => {
        const newFavorites = new Set(favorites);
        if (newFavorites.has(productId)) {
            newFavorites.delete(productId);
        } else {
            newFavorites.add(productId);
        }
        setFavorites(newFavorites);
    };

    const addToCart = (product: any) => {
        // setCart([...cart, product]);
    };

    const renderStars = (rating: any) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={14}
                className={i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
            />
        ));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
            {/* Header */}
            <Navbar />

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold text-amber-900 mb-4">Premium Skincare Collection</h2>
                    <p className="text-lg text-amber-700 max-w-2xl mx-auto">
                        Discover our carefully curated selection of premium skincare products, formulated with natural ingredients for healthy, radiant skin.
                    </p>
                </div>
            </div>

            {/* Products Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <div key={product.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                            {/* Product Image */}
                            <div className="relative aspect-[3/4] bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-32 h-48 bg-gradient-to-b from-amber-600 to-amber-800 rounded-lg shadow-lg flex items-center justify-center">
                                        <div className="text-white text-center">
                                            <div className="text-xs mb-2">{product.category}</div>
                                            <div className="text-sm font-semibold px-2">{product.name.split(' ').slice(-2).join(' ')}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Favorite Button */}
                                <button
                                    onClick={() => toggleFavorite(product.id)}
                                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    <Heart
                                        size={16}
                                        className={`${favorites.has(product.id)
                                            ? 'fill-red-500 text-red-500'
                                            : 'text-gray-400 hover:text-red-500'
                                            } transition-colors`}
                                    />
                                </button>

                                {/* Discount Badge */}
                                {product.originalPrice > product.price && (
                                    <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="p-6">
                                {/* Category */}
                                <div className="text-xs font-medium text-amber-600 mb-2 tracking-wide">
                                    {product.category}
                                </div>

                                {/* Product Name */}
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                                    {product.name}
                                </h3>

                                {/* Rating */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex items-center">
                                        {renderStars(product.rating)}
                                    </div>
                                    <span className="text-sm text-gray-600">
                                        {product.rating}/5 ({product.reviews} reviews)
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-600 mb-4">
                                    {product.description}
                                </p>

                                {/* Highlights */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {product.highlights.map((highlight, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full"
                                        >
                                            {highlight}
                                        </span>
                                    ))}
                                </div>

                                {/* Pricing */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl font-bold text-gray-900">
                                        ₹{product.price.toLocaleString()}
                                    </span>
                                    {product.originalPrice > product.price && (
                                        <span className="text-sm text-gray-500 line-through">
                                            ₹{product.originalPrice.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                <div className="text-xs text-gray-500 mb-4">
                                    *inclusive of all taxes
                                </div>

                                {/* Add to Cart Button */}
                                <button
                                    onClick={() => addToCart(product)}
                                    className="w-full bg-amber-800 hover:bg-amber-900 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg"
                                >
                                    <ShoppingBag size={16} />
                                    Add to Bag
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Additional Features Section */}
                <div className="mt-16 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="w-12 h-12 bg-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-white font-bold">✓</span>
                            </div>
                            <h3 className="text-lg font-semibold text-amber-900 mb-2">Natural Ingredients</h3>
                            <p className="text-amber-700">Carefully sourced natural and organic ingredients for your skin's health</p>
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-white font-bold">🚚</span>
                            </div>
                            <h3 className="text-lg font-semibold text-amber-900 mb-2">Free Shipping</h3>
                            <p className="text-amber-700">Complimentary shipping on orders above ₹999</p>
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-white font-bold">↻</span>
                            </div>
                            <h3 className="text-lg font-semibold text-amber-900 mb-2">30-Day Returns</h3>
                            <p className="text-amber-700">Easy returns within 30 days of purchase</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default MelitaProductsPage;