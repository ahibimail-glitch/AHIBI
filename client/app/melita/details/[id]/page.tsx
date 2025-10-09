'use client';

import { useState, useEffect, type MouseEvent, type ChangeEvent, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Check, Shield, Truck, Heart, Star, Loader2, Minus, Plus, XCircle, Calendar as CalendarIcon, Clock, MapPin, Instagram, Ticket as TicketIcon, Users, CheckCircle2 } from 'lucide-react';
import Footer from '@/app/Footer';
import Navbar from '@/app/Navbar';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { createAuthRedirectUrl } from '@/utils/redirectUtils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import Image from 'next/image';
import TermsAndConditions from '@/components/AhibiFest/TermsAndConditons';
import FAQPage from '@/components/AhibiFest/FAQ';
import { format } from 'date-fns';

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
    {
        id: "71947811847165805",
        name: "Melita Balancing Moisturizer",
        originalPrice: "₹1,299.00",
        salePrice: "₹1,099.00",
        image: "/melita/product5.jpg",
        details:
            "A deeply nourishing, barrier-repairing moisturizer formulated for normal to dry and sensitive skin. It restores hydration, strengthens the skin barrier, and leaves your skin soft, smooth, and resilient.",
        benefits: [
            "Deep, long-lasting hydration",
            "Antioxidant protection",
            "Supports collagen and skin elasticity",
            "Barrier repair and strengthening",
            "Visible smoothing and softening",
            "Comforting and soothing relief"
        ]
    },

    {
        id: "71947811847165806",
        name: "Melita Dry Skin Daily Essentials",
        originalPrice: "₹4,623.00",
        salePrice: "₹3,606.00",
        image: "/melita/product6.jpg",
        details:
            "A complete 4-step skincare routine designed for dry, dull, or compromised skin. It restores your skin barrier, replenishes deep hydration, and protects your skin throughout the day.",
        benefits: [
            "Deeply hydrates at every step",
            "Repairs and strengthens the skin barrier",
            "Reduces flakiness, tightness, and discomfort",
            "Shields skin from UV, blue light, and pollution",
            "Smooths texture and restores glow",
            "Delivers all-day comfort and balance"
        ]
    }

];

interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface TicketType {
    _id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    description: string;
    benefits?: string[];
    capacity: number;
}

interface EventLocation {
    address: string;
    city: string;
    state?: string;
    country?: string;
}

interface Event {
    _id: string;
    title: string;
    description: string;
    banner: string;
    category: string;
    startDate: string;
    endDate: string;
    ticketTypes: TicketType[];
    location: EventLocation;
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
    const [ticketError, setTicketError] = useState<string | null>(null);
    const [termsError, setTermsError] = useState<string | null>(null);

    // AHIBI FEST Event State
    const [event, setEvent] = useState<Event | null>(null);
    const [eventLoading, setEventLoading] = useState(true);
    const [selectedTickets, setSelectedTickets] = useState<Map<string, { ticket: TicketType; quantity: number }>>(new Map());
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [termsModalOpen, setTermsModalOpen] = useState(false);
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const summaryRef = useRef<HTMLDivElement | null>(null);

    // AHIBI FEST Event ID (special event)
    const AHIBI_FEST_EVENT_ID = '68c2c33eb6ef88c76f50ce7c';

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
        // Clear form error when user starts typing
        if (formError) setFormError(null);
    };

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        // Fetch AHIBI FEST event data
        const fetchEvent = async () => {
            try {
                setEventLoading(true);
                console.log('Fetching AHIBI FEST event:', AHIBI_FEST_EVENT_ID);
                const response = await fetch(`/api/events/${AHIBI_FEST_EVENT_ID}`, {
                    cache: 'no-store',
                });
                console.log('AHIBI FEST response status:', response.status);
                if (response.ok) {
                    const data = await response.json();
                    console.log('AHIBI FEST event data:', data);
                    setEvent(data);
                } else {
                    console.error('Failed to fetch AHIBI FEST event:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching AHIBI FEST event:', error);
            } finally {
                setEventLoading(false);
            }
        };

        fetchEvent();
    }, []);

    // Recalculate coupon discount when selected tickets change
    useEffect(() => {
        if (appliedCoupon && appliedCoupon.code) {
            const melitaAmount = parseFloat(product.salePrice.replace(/[₹,]/g, ''));
            const ahibiTicketsAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
            const combinedAmount = melitaAmount + ahibiTicketsAmount;

            if (appliedCoupon.isAhibiFestCoupon) {
                // For AHIBI FEST coupons: 50% off Melita + coupon percentage off tickets
                const melitaDiscountAmount = Math.round((melitaAmount * 50) / 100);
                const ticketDiscountAmount = Math.round((ahibiTicketsAmount * appliedCoupon.discountPercentage) / 100);
                const totalDiscountAmount = melitaDiscountAmount + ticketDiscountAmount;

                setAppliedCoupon({
                    ...appliedCoupon,
                    discountAmount: totalDiscountAmount,
                    melitaDiscountAmount,
                    ticketDiscountAmount,
                    totalAmount: combinedAmount,
                    payable: Math.max(0, combinedAmount - totalDiscountAmount),
                });
            } else {
                // Apply discount ONLY on AHIBI tickets, not on Melita products (original logic)
                const discountPercentage = appliedCoupon.discountPercentage || 50; // Default to 50 for MELITA50
                const discountAmount = Math.round((ahibiTicketsAmount * discountPercentage) / 100);

                setAppliedCoupon({
                    ...appliedCoupon,
                    discountAmount,
                    totalAmount: combinedAmount,
                    payable: Math.max(0, combinedAmount - discountAmount),
                });
            }
        }
    }, [selectedTickets, product.salePrice]);

    const handlePayment = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        // Clear all errors
        setFormError(null);
        setTicketError(null);
        setTermsError(null);

        if (!user) {
            const errorMsg = 'Please log in to place an order.';
            setFormError(errorMsg);
            toast({ variant: 'destructive', title: 'Login required', description: errorMsg });
            router.push(createAuthRedirectUrl());
            return;
        }

        // Check if AHIBI tickets are selected
        if (selectedTickets.size === 0) {
            const errorMsg = 'Please select at least one AHIBI FEST ticket to proceed with your order.';
            setTicketError(errorMsg);
            toast({
                variant: 'destructive',
                title: 'No tickets selected',
                description: errorMsg
            });
            // Scroll to AHIBI tickets section
            const ticketsSection = document.querySelector('[data-ahibi-tickets]');
            if (ticketsSection) {
                ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.zip || !formData.phone) {
            const errorMsg = 'Please fill in all delivery details.';
            setFormError(errorMsg);
            toast({ variant: 'destructive', title: 'Missing details', description: errorMsg });
            // Scroll to delivery form
            const deliveryForm = document.querySelector('[data-delivery-form]');
            if (deliveryForm) {
                deliveryForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Check if AHIBI tickets selected but terms not accepted
        if (selectedTickets.size > 0 && !acceptedTerms) {
            const errorMsg = 'Please accept the terms and conditions for AHIBI FEST tickets.';
            setTermsError(errorMsg);
            toast({ variant: 'destructive', title: 'Terms required', description: errorMsg });
            // Scroll to terms checkbox
            const termsCheckbox = document.querySelector('[data-ahibi-terms]');
            if (termsCheckbox) {
                termsCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setLoading(true);

        try {
            const melitaAmount = parseFloat(product.salePrice.replace(/[₹,]/g, ''));
            const ahibiTicketsAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
            const combinedAmount = melitaAmount + ahibiTicketsAmount;
            const amount = Math.max(0, combinedAmount - (appliedCoupon?.discountAmount || 0));

            const token = localStorage.getItem('token');
            if (!token) {
                setFormError('Authentication token not found. Please log in again.');
                toast({ variant: 'destructive', title: 'Auth error', description: 'Please log in again.' });
                router.push(createAuthRedirectUrl());
                return;
            }

            const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/melita/orders`,
                {
                    amount,
                    product: {
                        id: product.id,
                        name: product.name,
                        image: product.image,
                        size: 'Standard'
                    },
                    userId: user.id,
                    deliveryAddress: formData,
                    ahibiTickets: selectedTickets.size > 0 ? {
                        eventId: AHIBI_FEST_EVENT_ID,
                        tickets: Array.from(selectedTickets.values()).map(item => ({
                            ticketType: item.ticket.name,
                            quantity: item.quantity,
                            price: item.ticket.price,
                        }))
                    } : undefined,
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
                        console.log('Payment successful, verifying...', response);
                        
                        // Show invoice generation loader
                        setIsGeneratingInvoice(true);

                        // Verify payment and create AHIBI bookings
                        const verifyResponse = await axios.post(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/melita/verify-payment-client`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        );

                        console.log('Payment verified:', verifyResponse.data);

                        // Mark coupon as used on the backend for non-MELITA50 codes
                        if (appliedCoupon?.code && appliedCoupon.code !== 'MELITA50') {
                            const apiBase = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
                            await fetch(`${apiBase}/api/coupons/${appliedCoupon.code}/use`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
                                },
                            }).catch(() => { });
                        }
                        
                        // Small delay to ensure all processing is complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Navigate to success page
                        router.push(`/melita/payment/success?payment_id=${response.razorpay_payment_id}&order_id=${order.id}&booking_id=${melitaBooking._id}`);
                    } catch (error) {
                        console.error('Error verifying payment:', error);
                        setIsGeneratingInvoice(false);
                        toast({ variant: 'destructive', title: 'Verification Error', description: 'Payment successful but verification failed. Please contact support.' });
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
                setCouponApplying(false);
                return;
            }

            const melitaAmount = parseFloat(product.salePrice.replace(/[₹,]/g, ''));
            const ahibiTicketsAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
            const combinedAmount = melitaAmount + ahibiTicketsAmount;

            // Check if there are AHIBI tickets to apply coupon on
            if (ahibiTicketsAmount <= 0) {
                setCouponError('Please select AHIBI FEST tickets to apply a coupon');
                toast({ variant: 'destructive', title: 'No AHIBI Tickets', description: 'Coupons can only be applied to AHIBI FEST tickets.' });
                setCouponApplying(false);
                return;
            }

            // Prepare selected tickets data for backend validation
            const selectedTicketsData = Array.from(selectedTickets.values()).map(item => ({
                ticketType: item.ticket.name,
                quantity: item.quantity,
                price: item.ticket.price
            }));

            const apiBase = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
            const res = await fetch(`${apiBase}/api/melita/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    code: couponCode, 
                    amount: ahibiTicketsAmount,
                    melitaAmount: melitaAmount,
                    selectedTickets: selectedTicketsData
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.valid) {
                setAppliedCoupon(null);
                setCouponError(data?.message || 'Invalid coupon');
                toast({ variant: 'destructive', title: 'Coupon invalid', description: data?.message || 'Invalid coupon' });
                return;
            }
            setAppliedCoupon(data);
            toast({ title: 'Coupon applied', description: data.message || `Coupon ${data.code} applied: ${data.discountPercentage}% off` });
        } catch (e) {
            console.error('Coupon apply error:', e);
            setCouponError('Failed to apply coupon');
            toast({ variant: 'destructive', title: 'Coupon error', description: 'Failed to apply coupon' });
        } finally {
            setCouponApplying(false);
        }
    };

    // return (
    //     <>
    //         PAGE NOT FOUND
    //     </>
    // );


    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
            {/* Navbar */}
            <Navbar />

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
                            <div className="flex items-baseline gap-1 mb-4 ">
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
                    {/* AHIBI FEST TICKETS */}
                    {eventLoading && (
                        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-6 sm:p-12 border-t border-gray-200">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                                <p className="text-gray-600">Loading AHIBI FEST tickets...</p>
                            </div>
                        </div>
                    )}
                    {!eventLoading && !event && (
                        <div className="bg-gradient-to-br from-gray-50/50 to-gray-100/50 p-6 sm:p-12 border-t border-gray-200">
                            <div className="text-center">
                                <p className="text-gray-600">AHIBI FEST tickets are currently unavailable. You can still purchase Melita products.</p>
                            </div>
                        </div>
                    )}
                    {!eventLoading && event && (
                        <div data-ahibi-tickets className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-6 sm:p-12 border-t border-gray-200">
                            <h2 className="text-3xl font-light text-gray-900 mb-2 text-center">Add AHIBI FEST 2025 Tickets</h2>
                            <p className="text-center text-gray-600 mb-8">Combine your Melita order with AHIBI FEST tickets and get a discount!</p>
                            <p className="text-center text-gray-600 mb-8">Use Code: <span className="bg-[#835339] text-white px-2 py-1 rounded-md">MELITA50</span> for 50% OFF on AHIBI FEST Tickets</p>

                            {/* Ticket Selection Error */}
                            {ticketError && (
                                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl animate-pulse">
                                    <div className="flex items-start gap-3">
                                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-semibold text-red-800 mb-1">Ticket Selection Required</h3>
                                            <p className="text-sm text-red-700">{ticketError}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Modal */}
                            <Dialog open={!!bookingError} onOpenChange={(open) => { if (!open) setBookingError(null); }}>
                                <DialogContent className="sm:max-w-lg md:max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-red-600">
                                            <XCircle className="h-5 w-5" />
                                            Booking Limit Reached
                                        </DialogTitle>
                                        <DialogDescription className="text-gray-800">
                                            {bookingError}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-end">
                                        <Button onClick={() => setBookingError(null)} className="bg-red-600 hover:bg-red-700 text-white">Okay</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Event Info Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
                                <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
                                    <div className="bg-indigo-100 rounded-full p-2">
                                        <CalendarIcon className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-gray-500">Date</p>
                                        <p className="text-sm font-semibold text-gray-900">{format(new Date(event.startDate), 'MMM d, yyyy')}</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
                                    <div className="bg-purple-100 rounded-full p-2">
                                        <Clock className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-gray-500">Time</p>
                                        <p className="text-sm font-semibold text-gray-900">{format(new Date(event.startDate), 'h:mm a')}</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
                                    <div className="bg-pink-100 rounded-full p-2">
                                        <MapPin className="h-5 w-5 text-pink-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-gray-500">Venue</p>
                                        <p className="text-sm font-semibold text-gray-900">{event.location.city}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="relative  overflow-hidden md:p-12 p-2 ">
                                <AspectRatio ratio={16 / 9}>
                                    <Image
                                        src={event.banner || "/placeholder.svg"}
                                        alt={event.title}
                                        fill
                                        className="object-contain transition-transform duration-300 "
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                                        priority
                                    />
                                    {/* <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div> */}
                                    {/* <div className="absolute bottom-4 left-4">
                                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">{event.title}</h1>
                                                <p className="text-xs sm:text-sm text-gray-200 mt-1">{event.category}</p>
                                              </div> */}
                                </AspectRatio>
                            </div>

                            {/* Ticket Selection */}
                            <div className="max-w-4xl mx-auto">
                                {event.ticketTypes && event.ticketTypes.length > 0 ? (
                                    <div className="space-y-6">
                                        {bookingError && (
                                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
                                                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                                <div className="text-sm">{bookingError}</div>
                                            </div>
                                        )}
                                        {/* Ticket Types */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                            {event.ticketTypes
                                                .filter((ticket) =>
                                                    ticket.name.toLowerCase().includes('general admission') ||
                                                    ticket.name.toLowerCase().includes('fan pit')
                                                )
                                                .map((ticket) => {
                                                    const availabilityPercentage = Math.max(
                                                        0,
                                                        Math.min(100, ((ticket.quantity - ticket.sold) / ticket.quantity) * 100)
                                                    );
                                                    const isSoldOut = ticket.quantity <= ticket.sold;
                                                    const isLimited = availabilityPercentage <= 20 && !isSoldOut;
                                                    const selectedItem = selectedTickets.get(ticket._id);
                                                    const quantity = selectedItem?.quantity || 0;

                                                    return (
                                                        <Card
                                                            key={ticket._id}
                                                            className={`border-2 transition-all duration-200 hover:shadow-md w-full max-w-full ${quantity > 0
                                                                ? 'border-indigo-500 bg-indigo-50/30'
                                                                : isSoldOut
                                                                    ? 'border-gray-200 bg-gray-50'
                                                                    : 'border-gray-200 hover:border-indigo-300'
                                                                } rounded-lg overflow-hidden relative`}
                                                        >
                                                            {isSoldOut && (
                                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded-lg">
                                                                    <img src="/sold-out.webp" className="h-60 w-60" alt="Sold Out" />
                                                                </div>
                                                            )}
                                                            <CardHeader className="p-4 pb-2">
                                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`p-2 rounded-full ${isSoldOut ? 'bg-gray-100' : quantity > 0 ? 'bg-indigo-100' : 'bg-gray-50'}`}>
                                                                            <TicketIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isSoldOut ? 'text-gray-400' : quantity > 0 ? 'text-indigo-600' : 'text-gray-600'}`} />
                                                                        </div>
                                                                        <div>
                                                                            <CardTitle className="text-base sm:text-lg text-gray-900">{ticket.name}</CardTitle>
                                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                                {isSoldOut && (
                                                                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                                                                                        Sold Out
                                                                                    </Badge>
                                                                                )}
                                                                                {isLimited && !isSoldOut && (
                                                                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs animate-pulse">
                                                                                        Limited Availability
                                                                                    </Badge>
                                                                                )}
                                                                                {quantity > 0 && (
                                                                                    <Badge className="bg-indigo-500 text-white text-xs">
                                                                                        {quantity} selected
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <span className="text-lg sm:text-xl font-semibold text-indigo-600">₹{ticket.price}</span>
                                                                        <p className="text-xs text-gray-500">per ticket</p>
                                                                    </div>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="p-4 pt-0">
                                                                <p className="text-green-600 font-bold mb-3">{ticket.description}</p>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">
                                                                        <Users className="h-3 w-3 mr-1" />
                                                                        {ticket.capacity} capacity
                                                                    </Badge>
                                                                </div>
                                                                {ticket.benefits && ticket.benefits.length > 0 && (
                                                                    <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-100">
                                                                        <p className="text-xs font-semibold text-gray-800 mb-2 flex items-center">
                                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                            Included Benefits
                                                                        </p>
                                                                        <ul className="space-y-1">
                                                                            {ticket.benefits.map((benefit: string, i: number) => (
                                                                                <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                                                                                    {benefit}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {!isSoldOut && (
                                                                    <Button
                                                                        onClick={() => {
                                                                            // Clear all other tickets and select only this one
                                                                            setSelectedTickets(new Map([[ticket._id, { ticket, quantity: 1 }]]));
                                                                            setTimeout(() => {
                                                                                summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                            }, 100);
                                                                        }}
                                                                        className={`w-full ${quantity > 0
                                                                            ? 'bg-green-600 hover:bg-green-700'
                                                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                                                            } text-white`}
                                                                    >
                                                                        {quantity > 0 ? '✓ Selected' : 'Select This Ticket'}
                                                                    </Button>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                        </div>


                                    </div>
                                ) : (
                                    <div className="py-6 text-center">
                                        <div className="bg-gray-100 rounded-full p-3 inline-flex mb-3">
                                            <TicketIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600">No tickets available for this event</p>
                                    </div>
                                )}
                            </div>

                            {/* Terms Modal */}
                            <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
                                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>AHIBI FEST 2025 - Terms and Conditions</DialogTitle>
                                    </DialogHeader>
                                    <TermsAndConditions />
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}

                    {/* Delivery Form Section */}
                    <div data-delivery-form className="bg-gradient-to-br from-amber-50/50 to-stone-50/50 p-12 border-t border-gray-200">
                        <h2 className="text-3xl font-light text-gray-900 mb-2 text-center">Complete Your Order</h2>
                        <p className="text-center text-gray-600 mb-8">Enter your delivery details below</p>

                        {/* Form Error */}
                        {formError && (
                            <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl animate-pulse">
                                <div className="flex items-start gap-3">
                                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-red-800 mb-1">Delivery Details Required</h3>
                                        <p className="text-sm text-red-700">{formError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name*</label>
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
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">Delivery Address*</label>
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
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">City*</label>
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
                                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">State*</label>
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
                                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">PIN Code*</label>
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
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number*</label>
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
                                {selectedTickets.size === 0 && (
                                    <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-xs text-amber-700 text-center">
                                            ⚠️ Please select AHIBI FEST tickets to apply coupons
                                        </p>
                                    </div>
                                )}
                                <p className="text-center text-gray-600 m-4">Use Code: <span className="bg-[#835339] text-white px-2 py-1 rounded-md">MELITA50</span> for 50% OFF on AHIBI FEST Tickets</p>

                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                    <input
                                        type="text"
                                        placeholder={selectedTickets.size === 0 ? "Select tickets first to apply coupon" : "Enter coupon code"}
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        disabled={selectedTickets.size === 0}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#835339] focus:border-transparent transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={couponApplying || !couponCode.trim() || selectedTickets.size === 0}
                                        className="px-6 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {couponApplying ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                                {couponError && <p className="text-xs text-red-600 mt-2">{couponError}</p>}
                                {/* {appliedCoupon?.discountAmount > 0 && (
                                    <div className="mt-3 p-3 bg-green-50 rounded-lg text-green-700">
                                        <div className="flex justify-between font-semibold mb-2">
                                            <span>Coupon ({appliedCoupon.code})</span>
                                            <span>-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                                        </div>
                                        {appliedCoupon.isAhibiFestCoupon && (
                                            <div className="text-xs space-y-1">
                                                {appliedCoupon.melitaDiscountAmount > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>• Melita Product (50% off)</span>
                                                        <span>-₹{appliedCoupon.melitaDiscountAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {appliedCoupon.ticketDiscountAmount > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>• AHIBI Tickets ({appliedCoupon.discountPercentage}% off)</span>
                                                        <span>-₹{appliedCoupon.ticketDiscountAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )} */}
                            </div>

                            {/* Summary breakdown */}
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Melita Product</span>
                                    <span className="font-semibold">₹{parseFloat(product.salePrice.replace(/[₹,]/g, '')).toLocaleString()}</span>
                                </div>
                                {selectedTickets.size > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">AHIBI FEST Tickets</span>
                                        <span className="font-semibold">₹{Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0).toLocaleString()}</span>
                                    </div>
                                )}
                                {appliedCoupon?.discountAmount > 0 && (
                                    <>
                                        {appliedCoupon.isAhibiFestCoupon ? (
                                            <>
                                                {appliedCoupon.melitaDiscountAmount > 0 && (
                                                    <div className="flex justify-between text-sm text-green-600">
                                                        <span>Melita Discount (50%)</span>
                                                        <span className="font-semibold">-₹{appliedCoupon.melitaDiscountAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {appliedCoupon.ticketDiscountAmount > 0 && (
                                                    <div className="flex justify-between text-sm text-green-600">
                                                        <span>Ticket Discount ({appliedCoupon.discountPercentage}%)</span>
                                                        <span className="font-semibold">-₹{appliedCoupon.ticketDiscountAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Discount ({appliedCoupon.code})</span>
                                                <span className="font-semibold">-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-[#835339]">₹{(() => {
                                        const melitaAmount = parseFloat(product.salePrice.replace(/[₹,]/g, ''));
                                        const ahibiAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
                                        return Math.max(0, melitaAmount + ahibiAmount - (appliedCoupon?.discountAmount || 0)).toLocaleString();
                                    })()}</span>
                                </div>
                            </div>

                            {/* Warning if no tickets selected */}
                            {selectedTickets.size === 0 && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-700 text-center font-medium">
                                        ⚠️ Please select at least one AHIBI FEST ticket before placing your order
                                    </p>
                                </div>
                            )}
                            {/* Terms and Conditions for AHIBI tickets */}
                            {selectedTickets.size > 0 && (
                                <>
                                    {termsError && (
                                        <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl animate-pulse">
                                            <div className="flex items-start gap-3">
                                                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <h3 className="font-semibold text-red-800 mb-1">Terms & Conditions Required</h3>
                                                    <p className="text-sm text-red-700">{termsError}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div data-ahibi-terms className={`flex items-start gap-2 p-4 rounded-lg border ${termsError ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'}`}>
                                        <Checkbox
                                            id="ahibi-terms"
                                            checked={acceptedTerms}
                                            onCheckedChange={(checked) => {
                                                setAcceptedTerms(checked as boolean);
                                                if (checked) setTermsError(null);
                                            }}
                                            className="mt-1"
                                        />
                                        <label
                                            htmlFor="ahibi-terms"
                                            className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                                        >
                                            I accept the{" "}
                                            <button
                                                type="button"
                                                onClick={() => setTermsModalOpen(true)}
                                                className="text-indigo-600 hover:underline font-semibold"
                                            >
                                                Terms and Conditions
                                            </button>
                                            {" "}for AHIBI FEST 2025 tickets*
                                        </label>
                                    </div>
                                </>
                            )}

                            {/* Place order with dynamic amount */}
                            <button
                                onClick={handlePayment}
                                disabled={selectedTickets.size === 0}
                                className={`w-full font-semibold rounded-xl py-4 mt-8 transition-all shadow-lg transform duration-300 ${selectedTickets.size === 0
                                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-[#835339] to-amber-700 text-white hover:shadow-2xl hover:scale-[1.02]'
                                    }`}
                            >
                                {loading ? 'PROCESSING...' : selectedTickets.size === 0 ? 'SELECT AHIBI FEST TICKETS TO CONTINUE' : `PLACE ORDER • ₹${(() => {
                                    const melitaAmount = parseFloat(product.salePrice.replace(/[₹,]/g, ''));
                                    const ahibiAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
                                    return Math.max(0, melitaAmount + ahibiAmount - (appliedCoupon?.discountAmount || 0)).toLocaleString();
                                })()}`}
                            </button>
                            {/* <p className="text-center text-sm text-gray-500 mt-4">🔒 Secure checkout • Free shipping on all orders • 30-day money-back guarantee</p> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Generation Loader Overlay */}
            {isGeneratingInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-4 text-center">
                        <div className="mb-6">
                            <Loader2 className="w-16 h-16 animate-spin text-[#835339] mx-auto" />
                        </div>
                        <h2 className="text-2xl font-light text-gray-900 mb-3">
                            Payment Successful!
                        </h2>
                        <p className="text-gray-600 mb-2">
                            Please do not reload or leave this page
                        </p>
                        <p className="text-lg font-semibold text-[#835339]">
                            Your invoice is getting generated...
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Verifying payment</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <Footer />

            {/* Toast Notifications */}
            <Toaster />
        </div>
    );
};

export default ProductDetailsPage;