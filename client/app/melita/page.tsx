
"use client"
import React, { useState } from 'react';
import { Star, ShoppingBag, Heart, User, Search } from 'lucide-react';
import Footer from '../Footer';
import Navbar from '../Navbar';
import { products } from './products';
import ProductShowcase from './components/ProductShowcase';
import Hero from './components/Hero';
import TopStrip from './components/TopStrip';
import Features from './components/Features';
const MelitaProductsPage = () => {
    const [favorites, setFavorites] = useState(new Set());
    const [cart, setCart] = useState([]);




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
            <TopStrip/>
            <Navbar />

            {/* Hero Section */}
            <Hero />
            {/* <Features/> */}

            <ProductShowcase />

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default MelitaProductsPage;