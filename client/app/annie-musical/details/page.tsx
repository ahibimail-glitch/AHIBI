'use client';

import React from 'react';
import { Star, Users, MapPin, Gift, Droplets, Coffee, Sparkles, Crown, Award } from 'lucide-react';
import Footer from '@/app/Footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Navbar from '@/app/Navbar';

const AnnieMusicalTickets = () => {
    const ticketTypes = [
        {
            id: 'premium',
            name: 'VIP Platinum',
            rows: 'Row X',
            seats: 22,
            price: '₹1,500',
            originalPrice: '₹2,000',
            gradient: 'from-amber-300 via-yellow-500 to-orange-600',
            bgGradient: 'from-amber-50/90 via-yellow-50/90 to-orange-100/90',
            cardGradient: 'from-amber-400/20 via-yellow-500/20 to-orange-600/20',
            textColor: 'text-amber-900',
            benefits: [
                'Front row - Ultimate stage experience',
                'Complimentary premium beverages & snacks',
                'Unlimited refreshments throughout show',
                'VIP lounge access during intermission',
                'Exclusive Annie merchandise gift'
            ],
            icon: <Crown className="w-7 h-7" />,
            popular: true,
            badge: 'Best Value'
        },
        {
            id: 'premium-plus',
            name: 'Gold Premium',
            rows: 'Row A, B, C',
            seats: 76,
            price: '₹1,000',
            originalPrice: '₹1,300',
            gradient: 'from-purple-400 via-pink-500 to-rose-600',
            bgGradient: 'from-purple-50/90 via-pink-50/90 to-rose-100/90',
            cardGradient: 'from-purple-500/20 via-pink-500/20 to-rose-600/20',
            textColor: 'text-purple-900',
            benefits: [
                'Premium seating with excellent view',
                'Complimentary soft beverages (Coke/Pepsi)',
                'Unlimited water & light refreshments',
                'Priority entry to venue',
                'Digital program & cast photos'
            ],
            icon: <Award className="w-7 h-7" />,
            popular: false,
            badge: 'Most Popular'
        },
        {
            id: 'standard',
            name: 'Silver Standard',
            rows: 'Row D-N',
            seats: 276,
            price: '₹500',
            originalPrice: '₹700',
            gradient: 'from-blue-400 via-cyan-500 to-teal-600',
            bgGradient: 'from-blue-50/90 via-cyan-50/90 to-teal-100/90',
            cardGradient: 'from-blue-500/20 via-cyan-500/20 to-teal-600/20',
            textColor: 'text-blue-900',
            benefits: [
                'Great view of the full stage',
                'Unlimited water throughout event',
                'Family-friendly seating arrangement',
                'Access to all venue facilities',
                'Perfect for group bookings'
            ],
            icon: <Sparkles className="w-7 h-7" />,
            popular: false,
            badge: 'Family Pick'
        }
    ];

    const handleBookTicket = (ticketType: string) => {
        console.log(`Booking ${ticketType} ticket`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Hero Section with Cover Image */}
            <div className="relative overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1507924538820-ede94a04019d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
                        }}
                    ></div>
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/70"></div>
                    {/* Accent gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-transparent to-purple-500/20"></div>
                </div>

                {/* Navbar */}
                <Navbar />

                {/* Hero Content */}
                <div className="relative px-4 py-24 sm:px-6 lg:px-8 flex items-center justify-center">
                    <div className="text-center max-w-5xl mx-auto">
                        {/* Main Title */}
                        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 mb-6 drop-shadow-2xl">
                            Annie
                        </h1>
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-8 drop-shadow-lg">
                            The Musical Broadway Experience
                        </h2>

                        {/* Subtitle */}
                        <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 mb-14 max-w-3xl mx-auto leading-relaxed">
                            Step into tomorrow with Annie and experience the magic of Broadway like
                            never before. Premium seating, world-class performances, and
                            unforgettable memories await.
                        </p>

                        {/* Event Stats */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-white/90">
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-md">
                                <Users className="w-6 h-6 text-amber-400" />
                                <span className="text-lg font-semibold">374 Premium Seats</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-md">
                                <Gift className="w-6 h-6 text-amber-400" />
                                <span className="text-lg font-semibold">₹500 – ₹1,500</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-md">
                                <Star className="w-6 h-6 text-amber-400" />
                                <span className="text-lg font-semibold">Broadway Quality</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Ticket Cards Section */}
            <div className="relative px-4 py-16 sm:px-6 lg:px-8">
                {/* Background Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent"></div>

                <div className="relative max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                            Choose Your Experience
                        </h2>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                            Select from our carefully curated seating options, each designed to
                            provide a unique and memorable Broadway experience
                        </p>
                    </div>{/* Call-to-Action Button */}
                    <div className="flex justify-center mt-12 mb-20">
                        <Button
                            asChild
                            className="px-14 py-6 text-2xl font-extrabold text-white rounded-full shadow-2xl 
               bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600
               transition-all duration-500 ease-in-out
               hover:scale-110 hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] 
               hover:from-pink-600 hover:via-rose-600 hover:to-purple-700
               active:scale-100 active:shadow-md"
                        >
                            <Link href="/annie-musical">✨ Confirm Your Seats Now! ✨</Link>
                        </Button>
                    </div>



                    {/* Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
                        {ticketTypes.map((ticket) => (
                            <div
                                key={ticket.id}
                                className={`relative flex flex-col bg-gradient-to-br ${ticket.cardGradient} backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 border border-white/30 hover:scale-105 hover:-translate-y-2`}
                            >
                                {/* Badge */}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                    <span
                                        className={`bg-gradient-to-r ${ticket.gradient} text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg border border-white/20`}
                                    >
                                        {ticket.badge}
                                    </span>
                                </div>

                                {/* Card Content */}
                                <div className="flex flex-col h-full bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/50">
                                    <div className="text-center mb-8">
                                        <div
                                            className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${ticket.gradient} rounded-full mb-6 shadow-xl`}
                                        >
                                            <div className="text-white">{ticket.icon}</div>
                                        </div>
                                        <h3 className={`text-3xl font-bold ${ticket.textColor} mb-3`}>
                                            {ticket.name}
                                        </h3>
                                        <div className="flex items-center justify-center gap-3 mb-3">
                                            <span className={`text-5xl font-extrabold ${ticket.textColor}`}>
                                                {ticket.price}
                                            </span>
                                            <div className="text-right">
                                                <div className="text-gray-400 line-through text-lg">
                                                    {ticket.originalPrice}
                                                </div>
                                                <div className="text-green-600 font-semibold text-sm">
                                                    Save{" "}
                                                    {parseInt(
                                                        ticket.originalPrice.replace("₹", "").replace(",", "")
                                                    ) -
                                                        parseInt(ticket.price.replace("₹", "").replace(",", ""))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className={`${ticket.textColor} opacity-75 text-lg`}>
                                            {ticket.rows} • {ticket.seats} seats available
                                        </p>
                                    </div>

                                    {/* Benefits grow to fill height */}
                                    <div className="space-y-4 flex-1">
                                        {ticket.benefits.map((benefit, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <div
                                                    className={`w-3 h-3 bg-gradient-to-r ${ticket.gradient} rounded-full mt-1.5 flex-shrink-0`}
                                                ></div>
                                                <span
                                                    className={`${ticket.textColor} opacity-90 text-base leading-relaxed`}
                                                >
                                                    {benefit}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>


                </div>
            </div>

            {/* Premium Benefits Section */}
            <div className="px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-r from-black/40 via-purple-900/30 to-black/40 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-white mb-4">Premium Experience Included</h2>
                        <p className="text-xl text-gray-300">Every ticket includes carefully crafted amenities for your comfort</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 backdrop-blur-xl rounded-3xl p-8 border border-amber-400/30">
                            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full mb-6 mx-auto shadow-xl">
                                <Coffee className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-4 text-center">Premium Refreshments</h3>
                            <p className="text-gray-300 text-center text-lg leading-relaxed">
                                VIP & Gold ticket holders enjoy complimentary premium beverages and gourmet snacks
                                throughout the performance
                            </p>
                        </div>
                        <div className="bg-gradient-to-r from-cyan-500/10 to-teal-600/10 backdrop-blur-xl rounded-3xl p-8 border border-cyan-400/30">
                            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-400 to-teal-600 rounded-full mb-6 mx-auto shadow-xl">
                                <Droplets className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-4 text-center">Unlimited Hydration</h3>
                            <p className="text-gray-300 text-center text-lg leading-relaxed">
                                All guests enjoy unlimited premium water service throughout the entire event
                                for optimal comfort
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-12 sm:px-6 lg:px-8 bg-black/60 backdrop-blur-sm border-t border-white/10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full mb-4">
                            <span className="text-2xl font-bold text-white">A</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Get in Touch</h3>
                        <p className="text-gray-300 text-lg">Ready to experience Annie? Contact us for bookings and inquiries</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-white">
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                            <span className="text-2xl">📧</span>
                            <div>
                                <div className="font-semibold">Email</div>
                                <div className="text-gray-300">connect@ahibi.in</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                            <span className="text-2xl">📞</span>
                            <div>
                                <div className="font-semibold">Phone</div>
                                <div className="text-gray-300">7005727288</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                            <span className="text-2xl">🌐</span>
                            <div>
                                <div className="font-semibold">Website</div>
                                <div className="text-gray-300">www.ahibi.in</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <Footer />
        </div>
    );
};

export default AnnieMusicalTickets;