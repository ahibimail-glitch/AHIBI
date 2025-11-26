"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Shield, Award, Clock } from 'lucide-react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { useAuth } from '@/hooks/useAuth';

interface Package {
    id: string;
    name: string;
    price: number;
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
        name: 'Shuttle Services (Dimapur)',
        price: 26999,
        priceDetails: 'per seat (one way)',
        duration: '15 mins (one way)',
        features: [
            '01st - 10th Dec',
            'Kohima ↔ Dimapur',
            '06:30 AM – 07:00 AM',
            'Priority boarding',
            '12 seats total'
        ],
        badgeText: 'Premium Transfer',
        badgeVariant: 'premium',
        image: "/images/HeliTaxii/package-kohima.jpg",
        buttonText: 'Book Now'
    },
    {
        id: 'hornbill-aerial',
        name: 'Hornbill Aerial Experience',
        price: 4800,
        priceDetails: 'per seat',
        duration: '6-7 mins (Joyride)',
        features: [
            '27th Nov - 10th Dec',
            'Kohima ↔ Kisama',
            'Slot 1: 09 AM – 12 PM',
            'Slot 2: 12 PM – 04 PM',
            'Kisama Heritage View'
        ],
        badgeText: 'Most Popular',
        badgeVariant: 'exclusive',
        image: "/images/HeliTaxii/package-hornbill.jpg",
        buttonText: 'Book Now'
    },
    {
        id: 'dzukou-valley',
        name: 'Dzükōu Valley Experience',
        price: 9999,
        priceDetails: 'per seat',
        duration: '15-17 mins (Joyride)',
        features: [
            '01st - 10th Dec',
            'Kohima ↔ Dzükōu',
            'Slot 1: 09 AM – 12 PM',
            'Slot 2: 12 PM – 04 PM',
            'Valley View (No land)'
        ],
        badgeText: 'Scenic Wonder',
        badgeVariant: 'luxury',
        image: "/images/HeliTaxii/package-dzukou.jpg",
        buttonText: 'Book Now'
    },
    {
        id: 'shuttle-kigwema',
        name: 'Shuttle Service (Kigwema)',
        price: 6999,
        priceDetails: 'per seat (Round Trip)',
        duration: '8-10 mins (Round)',
        features: [
            '01st - 10th Dec',
            'Kohima ↔ Kigwema',
            '09:00 AM – 09:30 AM',
            '12:00 PM – 12:30 PM',
            'Fast connectivity'
        ],
        badgeText: 'Best Value',
        badgeVariant: 'default',
        image: "/images/HeliTaxii/package-kigwema.jpg",
        buttonText: 'Book Now'
    }
];

const HelicopterBookingPage = () => {
    const { loading, isAuthenticated } = useAuth();

    // While checking auth or if about to redirect, don't render the page content
    if (loading || !isAuthenticated) {
        return null;
    }

    const BOOKING_URL = "https://helitaxii.com/bookwithus?tab=HORNBILL&utm_source=ahibi.in";

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

    const scrollToPackages = () => {
        document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Hero Section */}
            <Navbar />
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${"/images/HeliTaxii/hero-helicopter.jpg"})` }}
                />
                <div className="absolute inset-0 bg-black/50" />

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto text-white">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                        Hornbill Above the Clouds
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        Discover the festival, the valleys, and the hills of Nagaland from the sky.
                    </p>
                    <Button
                        size="lg"
                        onClick={scrollToPackages}
                        className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 animate-fade-in"
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
                        <p className="text-muted-foreground">
                            Exclusive flights for Hornbill Festival 2025
                        </p>
                    </div>

                    {/* Grid Layout: Changed to 4 columns on Large screens for compactness */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {packages.map((pkg, index) => (
                            <Card
                                key={pkg.id}
                                className="relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Badge - Smaller */}
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

                                {/* Image - Reduced Height */}
                                <div className="h-40 overflow-hidden">
                                    <img
                                        src={pkg.image}
                                        alt={pkg.name}
                                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                    />
                                </div>

                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-lg font-bold leading-tight min-h-[44px]">
                                        {pkg.name}
                                    </CardTitle>
                                    <div className="mt-2">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-foreground">₹{pkg.price.toLocaleString()}</span>
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
                                        className="w-full h-10 text-sm font-semibold"
                                        onClick={() => handleBookRedirect(pkg)}
                                    >
                                        {pkg.buttonText}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
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