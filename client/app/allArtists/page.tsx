"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Music,
  Mic,
  Camera,
  Palette,
  Users,
  Trophy,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Search,
  ChevronRight,
  Star,
  Calendar,
  Award,
  Headphones,
  Radio,
  Tv,
  Film,
  ChevronLeft,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
  Zap,
  Target,
  Shield,
  Check,
  ArrowRight,
  Building2,
  Heart,
  Briefcase,
  Globe,
} from "lucide-react";
import Footer from "../Footer";
import Navbar from "../Navbar";
import Link from "next/link";

const popularArtists = [
  {
    id: 1,
    name: "Asha Sharma",
    category: "Singer",
    rating: 4.9,
    bookings: 156,
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 2,
    name: "DJ Rohan",
    category: "DJ",
    rating: 4.8,
    bookings: 234,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 3,
    name: "Maya Kumar",
    category: "Performer",
    rating: 4.7,
    bookings: 189,
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
  },
];

const categories = [
  { icon: Mic, title: "DJ", desc: "Professional DJs for all events", count: "500+" },
  { icon: Music, title: "Singer", desc: "Talented vocalists", count: "400+" },
  { icon: Users, title: "Band", desc: "Live bands & musicians", count: "300+" },
  { icon: Sparkles, title: "Dancer", desc: "Professional dancers", count: "350+" },
  { icon: Camera, title: "Anchor/MC", desc: "Event hosts & MCs", count: "250+" },
  { icon: Palette, title: "Comedian", desc: "Stand-up comedians", count: "150+" },
  { icon: Trophy, title: "Magician", desc: "Magicians & illusionists", count: "100+" },
  { icon: Award, title: "Celebrity", desc: "Celebrity appearances", count: "80+" },
];

const whyJoin = [
  {
    icon: TrendingUp,
    title: "Grow Your Career",
    description: "Reach thousands of event organizers looking for talented artists. Get discovered and booked for events nationwide.",
    stat: "10,000+ monthly bookings"
  },
  {
    icon: DollarSign,
    title: "Earn More Money",
    description: "Set your own rates and keep 85-95% of your earnings. No hidden fees, transparent pricing, and direct payments.",
    stat: "₹50,000 avg. monthly earnings"
  },
  {
    icon: Shield,
    title: "Secure & Professional",
    description: "Protected payments, verified bookings, and contract management. We handle the logistics, you focus on performing.",
    stat: "100% payment guarantee"
  },
  {
    icon: BarChart3,
    title: "Manage Your Brand",
    description: "Professional profile, portfolio showcase, calendar management, and detailed analytics to grow your business.",
    stat: "Complete business toolkit"
  },
];

const howToJoin = [
  {
    step: 1,
    title: "Create Your Profile",
    description: "Sign up and create your artist profile in minutes. Add your basic information, category, and contact details.",
    duration: "3 minutes",
    icon: Users
  },
  {
    step: 2,
    title: "Build Your Portfolio",
    description: "Upload photos, videos, performance samples, and showcase your talent. Add your rates, availability, and services.",
    duration: "20 minutes",
    icon: Camera
  },
  {
    step: 3,
    title: "Get Verified",
    description: "Our team reviews your profile to ensure quality. Once verified, you appear in search results and can receive bookings.",
    duration: "24-48 hours",
    icon: Award
  },
  {
    step: 4,
    title: "Start Performing",
    description: "Receive booking requests, manage your schedule, and get paid directly. Build your reputation with reviews.",
    duration: "Ongoing",
    icon: Zap
  },
];

const benefits = [
  { text: "Free to create profile", icon: DollarSign },
  { text: "Instant booking notifications", icon: Zap },
  { text: "Secure payment processing", icon: Shield },
  { text: "Calendar & schedule management", icon: Calendar },
  { text: "Portfolio & media showcase", icon: Camera },
  { text: "Direct client communication", icon: Phone },
  { text: "Review & rating system", icon: Star },
  { text: "Marketing & promotion", icon: TrendingUp },
  { text: "24/7 support assistance", icon: Clock },
];

const eventTypes = [
  {
    title: "Corporate Events",
    count: "5000+ bookings/month",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop",
    color: "bg-blue-50",
    description: "Conferences, team building, product launches"
  },
  {
    title: "Weddings & Celebrations",
    count: "3000+ bookings/month",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop",
    color: "bg-pink-50",
    description: "Weddings, anniversaries, receptions"
  },
  {
    title: "Private Parties",
    count: "2000+ bookings/month",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop",
    color: "bg-purple-50",
    description: "Birthdays, house parties, gatherings"
  },
  {
    title: "Concerts & Festivals",
    count: "1500+ bookings/month",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=200&fit=crop",
    color: "bg-orange-50",
    description: "Music festivals, cultural events, concerts"
  },
];

const faqs = [
  {
    q: "Who can join as an artist on AHiBi?",
    a: "Any performing artist can join! This includes singers, musicians, DJs, dancers, bands, comedians, magicians, anchors/MCs, performers, and celebrities. If you entertain at events, you're welcome to create a profile.",
  },
  {
    q: "How much does it cost to join?",
    a: "Creating your artist profile is completely FREE. We only charge a small commission (5-15% depending on your plan) when you successfully complete a booking. No monthly fees, no hidden charges.",
  },
  {
    q: "How do I get paid?",
    a: "Payments are processed securely through Razorpay. When a booking is confirmed and the event is completed, funds are transferred to your registered bank account within 3-5 business days. You can track all earnings in your dashboard.",
  },
  {
    q: "Can I set my own pricing?",
    a: "Yes! You have full control over your rates. Set different prices for different event types, durations, and services. You can also offer package deals and custom quotes for specific requests.",
  },
  {
    q: "How does the booking process work?",
    a: "Event organizers search for artists, view your profile, and send booking requests. You receive instant notifications, can accept/decline requests, and communicate directly with clients through our platform.",
  },
  {
    q: "What if I need to cancel a booking?",
    a: "While we encourage honoring confirmed bookings, emergencies happen. You can cancel through your dashboard. Cancellation policies vary by plan and timing - check your artist agreement for details.",
  },
];

const tiers = [
  {
    name: "Basic",
    tag: "Free Forever",
    price: "₹0/month",
    commission: "15% per booking",
    bullets: [
      "Artist profile listing",
      "Up to 5 photos/videos",
      "Basic calendar management",
      "Email notifications",
      "Customer reviews",
      "Standard search visibility"
    ],
    cta: "Join Free",
    popular: false
  },
  {
    name: "Professional",
    tag: "Most Popular",
    price: "₹1,999/month",
    commission: "10% per booking",
    bullets: [
      "Everything in Basic",
      "Priority search placement",
      "Unlimited media uploads",
      "Advanced analytics",
      "Featured artist badge",
      "Priority customer support",
      "Promotional campaigns"
    ],
    cta: "Go Pro",
    popular: true
  },
  {
    name: "Premium",
    tag: "For Top Artists",
    price: "₹4,999/month",
    commission: "5% per booking",
    bullets: [
      "Everything in Professional",
      "Verified artist status",
      "Dedicated account manager",
      "Custom branding options",
      "Top placement guarantee",
      "Social media promotion",
      "Exclusive event opportunities"
    ],
    cta: "Get Premium",
    popular: false
  },
];

const clients = [
  { name: "Google", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" },
  { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" },
  { name: "Apple", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { name: "Uber", logo: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" },
];

const Section = ({ children, id, className = "" }: { children: React.ReactNode; id?: string; className?: string }) => (
  <section id={id} className={`py-8 md:py-16 lg:py-20 ${className}`}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);

export default function AhibiArtistPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-[450px] md:h-[550px] lg:h-[650px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&h=900&fit=crop"
            alt="Artist performing"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
        </div>

        <div className="relative h-full flex items-center justify-center">
          <div className="text-center px-4 max-w-5xl mx-auto">

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 mt-7 md:mb-6 drop-shadow-2xl leading-tight">
              Showcase Your Talent,<br className="hidden sm:block" />
              <span className="text-rose-400">Grow Your Career</span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/95 mb-8 md:mb-10 max-w-3xl mx-auto drop-shadow-lg">
              Connect with event organizers nationwide. Get booked for events.<br className="hidden md:block" />
              Build your brand and earn what you deserve.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
              <Link href="/artist/auth/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white px-8 md:px-10 py-6 text-base md:text-lg font-semibold shadow-2xl">
                  Join as Artist
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-to-join" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 md:px-10 py-6 text-base md:text-lg font-semibold backdrop-blur-sm bg-white/10">
                  See How It Works
                </Button>
              </Link>
            </div>

            <div className="mt-8 md:mt-10 flex flex-wrap justify-center items-center gap-4 md:gap-8 text-sm md:text-base text-white/90">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-rose-400" />
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-rose-400" />
                <span>Set your own rates</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-rose-400" />
                <span>Get verified in 48hrs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Artists */}
      <Section className="bg-gray-50">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Featured Artists</h2>
            <p className="text-gray-600 text-sm md:text-base">Successful artists already performing with AHiBi</p>
          </div>
          <Link href="/allArtists/list">
            <Button variant="link" className="text-rose-600 hover:text-rose-700 hidden md:flex">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {popularArtists.map((artist) => (
            <Card key={artist.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0 group">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <Badge className="absolute top-3 left-3 bg-rose-600 hover:bg-rose-700 text-white border-0">
                  {artist.category}
                </Badge>
              </div>
              <CardContent className="p-4 md:p-5">
                <h3 className="font-semibold text-lg md:text-xl text-gray-900 mb-2">{artist.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{artist.category} • {artist.bookings} bookings</p>
                <div className="flex items-center text-sm border-t pt-3">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-medium">{artist.rating}</span>
                  <span className="text-gray-500 ml-1">rating</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/allArtists/list">
            <Button variant="outline" size="lg" className="border-2 border-rose-600 text-rose-600 hover:bg-rose-50">
              Explore All Artists
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </Section>

      {/* Why Join Section */}
      <Section id="why-join">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Why Artists Choose AHiBi
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            Join thousands of artists who are growing their careers and earning more with our platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {whyJoin.map((item, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="p-3 md:p-4 rounded-xl bg-rose-100 group-hover:bg-rose-600 transition-colors duration-300 flex-shrink-0">
                    <item.icon className="h-6 w-6 md:h-8 md:w-8 text-rose-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 mb-4 text-sm md:text-base">{item.description}</p>
                    <Badge variant="secondary" className="bg-rose-100 text-rose-700 border-0 text-sm">
                      {item.stat}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* How to Join Section */}
      <Section id="how-to-join" className="bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50">
        <div className="text-center mb-10 md:mb-16">
          <Badge className="mb-4 bg-rose-600 hover:bg-rose-700 text-white border-0 px-4 py-1.5">
            Simple Process
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            How to Join AHiBi
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            Get your artist profile live and start receiving bookings in just 4 easy steps
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {howToJoin.map((item, index) => (
            <div key={index} className="relative mb-8 md:mb-12 last:mb-0">
              {index < howToJoin.length - 1 && (
                <div className="absolute left-6 md:left-8 top-20 md:top-24 w-0.5 h-full bg-gradient-to-b from-rose-300 to-purple-300 -z-10"></div>
              )}

              <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-rose-600 to-purple-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg">
                          {item.step}
                        </div>
                      </div>
                      <div className="md:hidden flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                        <Badge variant="secondary" className="bg-rose-100 text-rose-700 border-0 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.duration}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex-1 w-full">
                      <div className="hidden md:flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                        <Badge variant="secondary" className="bg-rose-100 text-rose-700 border-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.duration}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="hidden lg:flex p-4 rounded-xl bg-rose-100 flex-shrink-0">
                      <item.icon className="h-8 w-8 text-rose-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 md:mt-12">
          <Link href="/artist/auth/signup">
            <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white px-10 md:px-12 py-6 text-base md:text-lg font-semibold shadow-xl">
              Start Your Journey - It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </Section>

      {/* Artist Categories */}
      <Section className="bg-white">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            All Artist Categories
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            Whatever your talent, there's demand for it on AHiBi
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0 group bg-gray-50">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-xl bg-rose-100 group-hover:bg-rose-600 transition-colors duration-300 flex items-center justify-center mb-4">
                    <category.icon className="h-7 w-7 text-rose-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-2">{category.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{category.desc}</p>
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700 border-0 text-xs">
                    {category.count} artists
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Event Types */}
      <Section className="bg-gray-50">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Perform at All Types of Events
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            From corporate events to private parties, find your perfect gig
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {eventTypes.map((event, index) => (
            <Card key={index} className={`overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0 group ${event.color}`}>
              <CardContent className="p-0">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                  <p className="text-xs text-rose-600 font-medium">{event.count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Benefits Section */}
      <Section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-gray-300 text-base md:text-lg max-w-3xl mx-auto">
            We've built the complete toolkit for artist success
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-5 hover:bg-white/20 transition-colors duration-300">
              <div className="p-2 rounded-lg bg-rose-600/20 flex-shrink-0">
                <benefit.icon className="h-5 w-5 text-rose-400" />
              </div>
              <span className="text-sm md:text-base font-medium">{benefit.text}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing Plans */}
      <Section id="plans" className="bg-gray-50">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            Start free, upgrade anytime. All plans include our core features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {tiers.map((t, index) => (
            <Card key={t.name} className={`border-0 shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${t.popular ? 'ring-2 ring-rose-600 scale-105 md:scale-110' : ''}`}>
              {t.popular && (
                <div className="absolute top-0 right-0 bg-rose-600 text-white px-4 py-1 text-xs font-bold">
                  MOST POPULAR
                </div>
              )}
              <CardHeader className="pb-4">
                <Badge variant="secondary" className={`w-fit ${t.popular ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-700'} border-0 mb-3`}>
                  {t.tag}
                </Badge>
                <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-3xl md:text-4xl font-bold text-gray-900">{t.price}</span>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-rose-600">{t.commission}</span> commission on bookings
                </p>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-3 text-sm">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-rose-600 flex-shrink-0" />
                      <span className="text-gray-700">{b}</span>
                    </li>
                  ))}
                </ul>
                <Button className={`w-full ${t.popular ? 'bg-rose-600 hover:bg-rose-700' : 'bg-gray-900 hover:bg-gray-800'} text-white py-6`}>
                  {t.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Our Clients */}
      <Section className="bg-white">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Trusted By Leading Brands
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            Our artists perform at events organized by top companies worldwide
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center max-w-5xl mx-auto">
          {clients.map((client, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-6 bg-gray-50 rounded-2xl hover:shadow-lg transition-all duration-300"
            >
              <img
                src={client.logo}
                alt={client.name}
                className="h-8 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ Section */}
      <Section id="faq" className="bg-gray-50">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            Everything you need to know about joining AHiBi as an artist
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {faqs.map((f, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{f.q}</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 text-sm md:text-base leading-relaxed">{f.a}</CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <Section id="join" className="bg-gradient-to-br from-rose-600 via-rose-500 to-purple-600">
        <div className="rounded-2xl md:rounded-3xl bg-white/10 backdrop-blur-sm p-6 md:p-12 lg:p-16 shadow-2xl border border-white/20">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
              Ready to Launch Your Artist Career?
            </h2>
            <p className="text-rose-50 text-base md:text-xl mb-8 md:mb-10 max-w-2xl mx-auto">
              Join 10,000+ artists already earning and growing with AHiBi. Create your profile today and start receiving bookings within 48 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 md:mb-10">
              <Link href="/artist/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-white text-rose-600 hover:bg-gray-100 font-semibold px-10 md:px-12 py-6 text-base md:text-lg shadow-xl">
                  Join as Artist - Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/artist/auth/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-rose-600 font-semibold px-10 md:px-12 py-6 text-base md:text-lg">
                  Artist Login
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm max-w-3xl mx-auto">
              <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
                <Check className="mx-auto mb-2 h-5 w-5" />
                <div className="font-semibold">Free to Join</div>
              </div>
              <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
                <Check className="mx-auto mb-2 h-5 w-5" />
                <div className="font-semibold">Set Your Rates</div>
              </div>
              <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
                <Check className="mx-auto mb-2 h-5 w-5" />
                <div className="font-semibold">Verified Profile</div>
              </div>
              <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
                <Check className="mx-auto mb-2 h-5 w-5" />
                <div className="font-semibold">24/7 Support</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}