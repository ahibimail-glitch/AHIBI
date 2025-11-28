"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Shield, Award, Clock, MapPin, Users, Crown } from 'lucide-react';
import Navbar from '../Navbar';
import Footer from '../Footer';

interface Package {
    id: string;
    name: string;
    subName?: string;
    price: number;
    originalPrice: number;
    priceDetails: string;
    duration: string;
    features: string[];
    badgeText: string;
    badgeVariant: 'premium' | 'luxury' | 'exclusive' | 'default';
    image: string;
    buttonText: string;
}

const packages: Package[] = [
    {
        id: 'shuttle-dimapur',
        name: 'Shuttle Services',
        subName: 'Kohima → Dimapur → Kohima',
        price: 21599,
        originalPrice: 26999,
        priceDetails: 'per seat (One-Way)',
        duration: '15 mins',
        features: [
            '01st - 10th Dec',
            '06:30 AM – 07:00 AM',
            'Priority boarding',
            'Fastest connectivity'
        ],
        badgeText: 'Premium Transfer',
        badgeVariant: 'premium',
        image: "/images/HeliTaxii/package-kohima.jpg",

        buttonText: 'Book Now'
    },
    {
        id: 'hornbill-slot1',
        name: 'Hornbill Joyride',
        subName: 'Slot 1: Morning',
        price: 3840,
        originalPrice: 4800,
        priceDetails: 'per seat',
        duration: '6-7 mins',
        features: [
            '27th Nov - 10th Dec',
            'Kohima ↔ Kisama',
            '09:00 AM – 12:00 PM',
            'Kisama Heritage View'
        ],
        badgeText: 'Morning Slot',
        badgeVariant: 'exclusive',
        image: "/images/HeliTaxii/package-hornbill.jpg",

        buttonText: 'Book Slot 1'
    },
    {
        id: 'hornbill-slot2',
        name: 'Hornbill Joyride',
        subName: 'Slot 2: Afternoon',
        price: 3840,
        originalPrice: 4800,
        priceDetails: 'per seat',
        duration: '6-7 mins',
        features: [
            '27th Nov - 10th Dec',
            'Kohima ↔ Kisama',
            '12:00 PM – 04:00 PM',
            'Kisama Heritage View'
        ],
        badgeText: 'Afternoon Slot',
        badgeVariant: 'exclusive',
        image: "/images/HeliTaxii/package-hornbill.jpg",

        buttonText: 'Book Slot 2'
    },
    {
        id: 'dzukou-slot1',
        name: 'Dzükōu Valley',
        subName: 'Slot 1: Morning',
        price: 7999,
        originalPrice: 9999,
        priceDetails: 'per seat',
        duration: '15-17 mins',
        features: [
            '01st - 10th Dec',
            'Kohima ↔ Dzükōu',
            '09:00 AM – 12:00 PM',
            'Valley View (No land)'
        ],
        badgeText: 'Scenic Morning',
        badgeVariant: 'luxury',
        image: "/images/HeliTaxii/package-dzukou.jpg",

        buttonText: 'Book Slot 1'
    },
    {
        id: 'dzukou-slot2',
        name: 'Dzükōu Valley',
        subName: 'Slot 2: Afternoon',
        price: 7999,
        originalPrice: 9999,
        priceDetails: 'per seat',
        duration: '15-17 mins',
        features: [
            '01st - 10th Dec',
            'Kohima ↔ Dzükōu',
            '12:00 PM – 04:00 PM',
            'Valley View (No land)'
        ],
        badgeText: 'Golden Hour',
        badgeVariant: 'luxury',
        image: "/images/HeliTaxii/package-dzukou.jpg",

        buttonText: 'Book Slot 2'
    },
    {
        id: 'shuttle-kigwema',
        name: 'Shuttle Services',
        subName: 'Kigwema Sector',
        price: 5599,
        originalPrice: 6999,
        priceDetails: 'per seat (Round Trip)',
        duration: '8-10 mins',
        features: [
            '01st - 10th Dec',
            'Kohima ↔ Kigwema',
            'Morning & Noon Slots',
            'Fast connectivity'
        ],
        badgeText: 'Best Value',
        badgeVariant: 'default',
        image: "/images/HeliTaxii/package-kigwema.jpg",

        buttonText: 'Book Now'
    }
];

const HelicopterBookingPage = () => {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                router.replace(`/auth?redirect=${encodeURIComponent('/HeliTaxii')}`);
            } else {
                setIsAuthorized(true);
            }
        } catch {
            router.replace(`/auth?redirect=${encodeURIComponent('/HeliTaxii')}`);
        }
    }, [router]);

    if (!isAuthorized) return null;

    const BOOKING_URL = "https://helitaxii.com/bookwithus?tab=HORNBILL&utm_source=ahibi.in";
    const CUSTOM_BOOKING_URL = "https://helitaxii.com/bookwithus?tab=HORNBILL&utm_source=ahibi.in";

    const handleBookRedirect = async (pkg: Package) => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (token) {
                await fetch('/api/helitaxii/leads', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        packageId: pkg.id,
                        packageName: pkg.name,
                        price: pkg.price,
                        duration: pkg.duration,
                    }),
                });
            }
        } catch (error) {
            console.error('Failed to create Helitaxii lead:', error);
        }
        window.open(BOOKING_URL, '_blank');
    };

    const handleCustomRedirect = () => {
        window.open(CUSTOM_BOOKING_URL, '_blank');
    };

    const scrollToPackages = () => {
        document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' });
    };

    const heroBg = "/images/HeliTaxii/hero-helicopter.jpg";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            {/* Hero Section */}

            <section className="relative h-[94vh] flex items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${heroBg})` }}
                />

                <div className="absolute inset-0 bg-black/50" />

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto text-white">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                        Hornbill Above the Clouds
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        Discover the festival, the valleys, and the hills of Nagaland from the sky.
                    </p>
                    <Button
                        size="lg"
                        onClick={scrollToPackages}
                        className="bg-red-500 text-white hover:bg-red-700 font-semibold px-8 animate-fade-in"
                        style={{ animationDelay: '0.3s' }}
                    >
                        View Packages
                    </Button>
                </div>
            </section>

            {/* Packages Section */}
            <section id="packages" className="py-16 px-4 bg-muted/30">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-3">
                            Helicopter Rides & Shuttles
                        </h2>
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-muted-foreground">
                                Exclusive flights for Hornbill Festival 2025
                            </p>
                            <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50 px-3 py-1 text-sm font-medium">
                                🎉 20% Festival Discount Applied
                            </Badge>
                        </div>
                    </div>

                    {/* Grid Layout: 3 columns for 6 cards */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                        {packages.map((pkg, index) => (
                            <Card
                                key={pkg.id}
                                className="relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Badge */}
                                <div className="absolute top-3 right-3 z-10">
                                    <Badge
                                        className={`text-xs px-2 py-0.5 ${pkg.badgeVariant === 'premium' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                                                pkg.badgeVariant === 'luxury' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                                                    pkg.badgeVariant === 'exclusive' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                                                        'bg-slate-700 text-white'
                                            }`}
                                    >
                                        {pkg.badgeText}
                                    </Badge>
                                </div>

                                {/* Image */}
                                <div className="h-40 overflow-hidden">
                                    <img
                                        src={pkg.image}
                                        alt={pkg.name}
                                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                    />
                                </div>

                                <CardHeader className="p-4 pb-2">
                                    <div className="min-h-[50px]">
                                        <CardTitle className="text-lg font-bold leading-tight">
                                            {pkg.name}
                                        </CardTitle>
                                        {pkg.subName && (
                                            <p className="text-sm font-medium text-accent mt-0.5">{pkg.subName}</p>
                                        )}
                                    </div>

                                    <div className="mt-2">
                                        {/* Price Display */}
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground line-through decoration-red-500/50">
                                                    ₹{pkg.originalPrice.toLocaleString()}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                                    20% OFF
                                                </Badge>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-foreground">₹{pkg.price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{pkg.priceDetails}</p>

                                        <div className="flex items-center gap-1.5 mt-2 text-primary/80 text-xs font-medium bg-primary/5 p-1.5 rounded w-fit">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{pkg.duration}</span>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 flex-grow">
                                    <div className="h-px bg-border my-3" />
                                    <ul className="space-y-2">
                                        {pkg.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                                                <span className="leading-tight">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter className="p-4 pt-0">
                                    <Button
                                        className="w-full h-10 text-sm font-semibold bg-red-500 hover:bg-red-700 text-white"
                                        onClick={() => handleBookRedirect(pkg)}
                                    >
                                        {pkg.buttonText}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {/* New Custom Charter Section */}
                    <div className="mb-16 animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-px bg-border flex-grow"></div>
                            <h3 className="text-2xl font-bold text-center flex items-center gap-2">
                                <Crown className="w-6 h-6 text-amber-500" />
                                Private Charter Experience
                            </h3>
                            <div className="h-px bg-border flex-grow"></div>
                        </div>

                        <Card className="overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-background to-primary/5">
                            <div className="grid md:grid-cols-5 gap-0">
                                {/* Left: Image */}
                                <div className="md:col-span-2 relative h-64 md:h-auto overflow-hidden">
                                    <img
                                        src={heroBg}
                                        alt="Private Charter"
                                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="text-center p-4">
                                            <Badge className="bg-red-500 text-white border-none text-sm px-3 py-1 mb-2">
                                                VIP Experience
                                            </Badge>
                                            <h4 className="text-white text-xl font-bold">Fly Anywhere</h4>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Content */}
                                <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center">
                                    <div className="mb-6">
                                        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                                            Your Custom Helicopter Charter
                                        </h3>
                                        <p className="text-muted-foreground">
                                            Choose your route, choose your time. Fly anywhere across Nagaland.
                                        </p>
                                    </div>

                                    {/* Charter Pricing */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-background rounded-lg p-4 border shadow-sm">
                                            <div className="text-sm text-muted-foreground mb-1">30 Minutes</div>
                                            <div className="text-xl md:text-2xl font-bold text-primary">₹1,00,000</div>
                                        </div>
                                        <div className="bg-background rounded-lg p-4 border shadow-sm">
                                            <div className="text-sm text-muted-foreground mb-1">60 Minutes</div>
                                            <div className="text-xl md:text-2xl font-bold text-primary">₹2,00,000</div>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-y-2 gap-x-4 mb-8">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="w-4 h-4 text-accent" /> Up to 5 passengers per flight
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="w-4 h-4 text-accent" /> Customisable aerial route across Nagaland
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Check className="w-4 h-4 text-accent" /> Priority boarding & assistance
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Check className="w-4 h-4 text-accent" /> Private helicopter for your group
                                        </div>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto bg-red-500 text-white hover:bg-red-700"
                                        onClick={handleCustomRedirect}
                                    >
                                        Book Custom Charter
                                    </Button>
                                    <p className="text-xs text-center md:text-left text-muted-foreground mt-3">
                                        Book directly at <a href="https://www.ahibi.in" className="underline hover:text-primary">www.ahibi.in</a>
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Compact Trust Elements */}
                    <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <div className="flex text-accent">
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                            </div>
                            <span>5.0 (312 reviews)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-accent" />
                            <span>FAA Certified</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-accent" />
                            <span>Safety Excellence 2024</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-primary text-primary-foreground py-8 px-4 text-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <div>
                        <h3 className="font-bold text-lg">Helitaxii</h3>
                        <p className="opacity-80 text-xs mt-1">Hornbill Festival Helicopter Services</p>
                    </div>

                    <div className="flex gap-6">
                        <a href="mailto:info@helitaxii.com" className="hover:text-accent transition-colors">info@helitaxii.com</a>
                        <a href="tel:+919400399999" className="hover:text-accent transition-colors">+91-9400399999</a>
                    </div>

                    <div className="opacity-60 text-xs">
                        &copy; 2025 Thumby Aviation Pvt. Ltd
                    </div>
                </div>
            </footer>
            <Footer />
        </div>
    );
};

export default HelicopterBookingPage;