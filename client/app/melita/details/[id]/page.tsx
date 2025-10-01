'use client';

import { useState, useEffect, type MouseEvent, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Check, Shield, Truck, Heart, Star } from 'lucide-react';
import Footer from '@/app/Footer';
import Navbar from '@/app/Navbar';
import { useToast } from '@/components/ui/use-toast';

const products = [
    {
        id: "71947811847165801",
        name: "Melita Ultra Hydrating Essence",
        originalPrice: "₹1,499.00",
        salePrice: "₹1,199.00",
        image: "/melita/product1.jpg",
        details:
            "Meet Melita Ultra Hydrating Essence. A featherlight essence powered by Squalane, Hyaluronic Acid, and Peptides to deeply hydrate, strengthen your skin barrier, and prep your skin for actives. Clinically shown to boost hydration by up to 400%. Healthy skin starts with a strong, resilient barrier.",
        benefits: ["Boosts hydration by 400%", "Strengthens skin barrier", "Preps skin for actives"]
    },
    {
        id: "71947811847165802",
        name: "Melita Ultra Protecting Sunscreen",
        originalPrice: "₹1,450.00",
        salePrice: "₹1,299.00",
        image: "/melita/product2.jpg",
        details:
            "Your daily skin shield. Meet your new favourite sun shield. This SPF 50+ PA++++ sunscreen blends into your skin within seconds, leaving no white cast and a beautiful, glass-like glow. Its gel-cream texture is refreshing and cooling, making application feel like a treat—not a chore. Infused with powerful antioxidants, it helps protect your skin from UV rays, pollution, and everyday environmental stressors—so you stay radiant and resilient, wherever life takes you.",
        benefits: ["SPF 50+ PA++++", "No white cast", "Glass-like glow"]
    },
    {
        id: "71947811847165803",
        name: "Melita Oily Skin Daily Essentials",
        originalPrice: "₹3,324.00",
        salePrice: "₹2,593.00",
        image: "/melita/product3.jpg",
        details:
            "Light on skin. Strong on results. This 3-step routine is designed to gently cleanse, deeply hydrate, and invisibly protect oily or acne-prone skin—all without heaviness, stickiness, or residue. The complete solution for balanced, healthy skin that stays fresh all day.",
        benefits: ["Complete 3-step routine", "Balances oil production", "Non-comedogenic"]
    },
    {
        id: "71947811847165804",
        name: "Melita Barrier Care Starter Duo",
        originalPrice: "₹1,874.00",
        salePrice: "₹1,499.00",
        image: "/melita/product4.jpg",
        details:
            "A Simple Start to Healthy Skin. Start strong with two foundational steps designed to reset your skin and support long-term health. The perfect introduction to a skincare routine that truly works.",
        benefits: ["Perfect for beginners", "Gentle cleansing", "Instant hydration"]
    },
];

interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

const ProductDetailsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    // Get product ID from URL
    const params = useParams();
    const { id } = params;
        const [isLiked, setIsLiked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplying, setCouponApplying] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        name: '', address: '', city: '', state: '', zip: '', phone: ''
    });
    const [formError, setFormError] = useState<string | null>(null);

    const product = products.find((p) => p.id === id);

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-stone-50">
                <div className="text-center">
                    <h2 className="text-2xl font-light text-gray-600">Product not found</h2>
                </div>
            </div>
        );
    }

    const discount = Math.round(((parseFloat(product.originalPrice.replace(/[₹,]/g, '')) - parseFloat(product.salePrice.replace(/[₹,]/g, ''))) / parseFloat(product.originalPrice.replace(/[₹,]/g, ''))) * 100);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
    }, []);

    const handlePayment = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.zip || !formData.phone) {
            setFormError('Please fill in all delivery details.');
            toast({ variant: 'destructive', title: 'Missing details', description: 'Please fill in all delivery details.' });
            return;
        }

        if (!user) {
            setFormError('Please log in to place an order.');
            toast({ variant: 'destructive', title: 'Login required', description: 'Please log in to place an order.' });
            router.push('/auth');
            return;
        }

        setLoading(true);

        try {
            const baseAmount = parseFloat(product.salePrice.replace(/[₹,]/g, ''));
            const amount = Math.max(0, baseAmount - (appliedCoupon?.discountAmount || 0));

                        const token = localStorage.getItem('token');
            if (!token) {
                setFormError('Authentication token not found. Please log in again.');
                toast({ variant: 'destructive', title: 'Auth error', description: 'Please log in again.' });
                router.push('/auth');
                return;
            }

            const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/melita/orders`, 
                {
                    amount,
                    product: {
                        id: product.id,
                        name: product.name,
                        image: product.image,
                        size: 'Standard' // Assuming a standard size for now
                    },
                    userId: user.id,
                    deliveryAddress: formData,
                    ...(appliedCoupon ? { coupon: { code: appliedCoupon.code, discountPercentage: appliedCoupon.discountPercentage, discountAmount: appliedCoupon.discountAmount } } : {}),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const { order, melitaBooking } = data;

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Melita Purchase',
                description: product.name,
                order_id: order.id,
                handler: async function (response: RazorpaySuccessResponse) {
                    try {
                        // Mark coupon as used on the backend for non-MELITA40 codes
                        if (appliedCoupon?.code && appliedCoupon.code !== 'MELITA40') {
                            const apiBase = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
                            await fetch(`${apiBase}/api/coupons/${appliedCoupon.code}/use`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
                                },
                            }).catch(() => {});
                        }
                        // Removed client-side reward generation to prevent duplicates
                    } catch (_) {
                        // Non-blocking: even if this fails, continue to success
                    } finally {
                        router.push(`/melita/payment/success?payment_id=${response.razorpay_payment_id}&order_id=${order.id}&booking_id=${melitaBooking._id}`);
                    }
                },
                prefill: {
                    name: formData.name,
                    contact: formData.phone,
                },
                theme: {
                    color: '#835339'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error('Payment failed:', error);
            setFormError('Payment failed. Please try again.');
            toast({ variant: 'destructive', title: 'Payment failed', description: 'Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyCoupon = async (): Promise<void> => {
        try {
            setCouponApplying(true);
            setCouponError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setCouponError('Please log in to apply coupon');
                toast({ variant: 'destructive', title: 'Login required', description: 'Please log in to apply coupon.' });
                return;
            }

            const baseAmount = parseFloat(product.salePrice.replace(/[₹,]/g, ''));

            // Special-case MELITA40: flat 40% off
            if (couponCode.trim().toUpperCase() === 'MELITA40') {
                const discountAmount = Math.round((baseAmount * 40) / 100);
                setAppliedCoupon({
                    valid: true,
                    code: 'MELITA40',
                    discountPercentage: 40,
                    discountAmount,
                    totalAmount: baseAmount,
                    payable: Math.max(0, baseAmount - discountAmount),
                });
                toast({ title: 'Coupon applied', description: 'MELITA40 applied: 40% off.' });
                return;
            }

            const apiBase = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
            const res = await fetch(`${apiBase}/api/melita/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ code: couponCode, amount: baseAmount }),
            });
            const data = await res.json();
            if (!res.ok || !data.valid) {
                setAppliedCoupon(null);
                setCouponError(data?.message || 'Invalid coupon');
                toast({ variant: 'destructive', title: 'Coupon invalid', description: data?.message || 'Invalid coupon' });
                return;
            }
            setAppliedCoupon(data);
            toast({ title: 'Coupon applied', description: `Coupon ${data.code} applied: ${data.discountPercentage}% off` });
        } catch (e) {
            console.error('Coupon apply error:', e);
            setCouponError('Failed to apply coupon');
            toast({ variant: 'destructive', title: 'Coupon error', description: 'Failed to apply coupon' });
        } finally {
            setCouponApplying(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
            {/* Navbar */}
           <Navbar/>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Main Product Section */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Image Section */}
                        <div className="relative bg-gradient-to-br from-amber-50 to-stone-100 p-12 flex items-center justify-center">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#835339]/20 to-transparent rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                                <img 
                                    src={product.image} 
                                    alt={product.name} 
                                    className="relative w-full h-auto object-cover rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500" 
                                />
                            </div>
                            <button 
                                onClick={() => setIsLiked(!isLiked)}
                                className="absolute top-8 right-8 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
                            >
                                <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'} transition-colors`} />
                            </button>
                            {discount > 0 && (
                                <div className="absolute top-8 left-8 bg-gradient-to-r from-[#835339] to-amber-600 text-white px-4 py-2 rounded-full shadow-lg">
                                    <span className="text-sm font-semibold">Save {discount}%</span>
                                </div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="p-12">
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    ))}
                                    <span className="text-sm text-gray-600 ml-2">(2,847 reviews)</span>
                                </div>
                                <h1 className="text-4xl font-light text-gray-900 mb-4 leading-tight">{product.name}</h1>
                                <p className="text-gray-600 leading-relaxed text-lg">{product.details}</p>
                            </div>

                            {/* Benefits */}
                            <div className="mb-8 space-y-3">
                                {product.benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="bg-emerald-100 rounded-full p-1">
                                            <Check className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-gray-700">{benefit}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-4 mb-4">
                                <span className="text-5xl font-light text-[#835339]">{product.salePrice}</span>
                                <span className="text-2xl line-through text-gray-400">{product.originalPrice}</span>
                            </div>
                            {/* Coupon input */}
                            {/* <div className="mb-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter coupon code"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={couponApplying || !couponCode.trim()}
                                        className="px-6 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        {couponApplying ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                                {couponError && <p className="text-xs text-red-600 mt-2">{couponError}</p>}
                                {appliedCoupon?.discountAmount > 0 && (
                                    <div className="mt-3 p-3 bg-green-50 rounded-lg text-green-700 flex justify-between">
                                        <span>Coupon ({appliedCoupon.code})</span>
                                        <span>-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="mt-3 p-3 bg-gray-100 rounded-lg flex justify-between">
                                    <span className="font-semibold text-gray-900">To Pay</span>
                                    <span className="font-bold text-indigo-600">₹{Math.max(0, parseFloat(product.salePrice.replace(/[₹,]/g, '')) - (appliedCoupon?.discountAmount || 0)).toLocaleString()}</span>
                                </div>
                            </div> */}

                            {/* Trust Badges */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-transparent rounded-xl">
                                    <Shield className="w-6 h-6 text-[#835339] mx-auto mb-2" />
                                    <span className="text-xs text-gray-600 font-medium">Dermatologist Tested</span>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-transparent rounded-xl">
                                    <Truck className="w-6 h-6 text-[#835339] mx-auto mb-2" />
                                    <span className="text-xs text-gray-600 font-medium">Free Shipping</span>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-transparent rounded-xl">
                                    <Check className="w-6 h-6 text-[#835339] mx-auto mb-2" />
                                    <span className="text-xs text-gray-600 font-medium">30-Day Returns</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Form Section */}
                    <div className="bg-gradient-to-br from-amber-50/50 to-stone-50/50 p-12 border-t border-gray-200">
                        <h2 className="text-3xl font-light text-gray-900 mb-2 text-center">Complete Your Order</h2>
                        <p className="text-center text-gray-600 mb-8">Enter your delivery details below</p>
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                    <input 
                                        type="text" 
                                        id="name" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                                    <input 
                                        type="text" 
                                        id="address" 
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Street address, apartment, etc."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                    <input 
                                        type="text" 
                                        id="city" 
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="City"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">State</label>
                                    <input 
                                        type="text" 
                                        id="state" 
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        placeholder="State"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                                    <input 
                                        type="text" 
                                        id="zip" 
                                        name="zip"
                                        value={formData.zip}
                                        onChange={handleInputChange}
                                        placeholder="123456"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        id="phone" 
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white" 
                                    />
                                </div>
                            </div>
                            {/* Coupon input inside checkout form */}
                            <div className="mt-2">
                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                    <input
                                        type="text"
                                        placeholder="Enter coupon code"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={couponApplying || !couponCode.trim()}
                                        className="px-6 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 h-[48px]"
                                    >
                                        {couponApplying ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                                {couponError && <p className="text-xs text-red-600 mt-2">{couponError}</p>}
                                {appliedCoupon?.discountAmount > 0 && (
                                    <div className="mt-3 p-3 bg-green-50 rounded-lg text-green-700 flex justify-between">
                                        <span>Coupon ({appliedCoupon.code})</span>
                                        <span>-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Place order with dynamic amount */}
                            <button
                                onClick={handlePayment}
                                className="w-full bg-gradient-to-r from-[#835339] to-amber-700 text-white font-semibold rounded-xl py-4 mt-8 transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02] transform duration-300"
                            >
                                {loading ? 'PROCESSING...' : `PLACE ORDER • ₹${Math.max(0, parseFloat(product.salePrice.replace(/[₹,]/g, '')) - (appliedCoupon?.discountAmount || 0)).toLocaleString()}`}
                            </button>
                            {/* <p className="text-center text-sm text-gray-500 mt-4">🔒 Secure checkout • Free shipping on all orders • 30-day money-back guarantee</p> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
           <Footer/>
        </div>
    );
};

export default ProductDetailsPage;