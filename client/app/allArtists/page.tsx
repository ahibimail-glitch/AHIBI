"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import Footer from "../Footer";
import Navbar from "../Navbar";
import Link from "next/link";

const popularArtists = [
  {
    id: 1,
    name: "Asha Sharma",
    category: "Singer",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 2,
    name: "DJ Rohan",
    category: "DJ",
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 3,
    name: "Maya Kumar",
    category: "Performer",
    image:
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 4,
    name: "The Echoes",
    category: "Band",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 5,
    name: "Nina",
    category: "Dancer",
    image:
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 6,
    name: "MC Karan",
    category: "MC",
    image:
      "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 7,
    name: "Arjun",
    category: "Musician",
    image:
      "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 8,
    name: "Priya",
    category: "Artist",
    image:
      "https://images.unsplash.com/photo-1497032205916-ac775f0649ae?auto=format&fit=crop&w=600&q=80",
  },
];

const categories = [
  { icon: Mic, title: "DJ", desc: "Professional DJs for all types of events" },
  { icon: Music, title: "Singer", desc: "Talented singers for your special occasions" },
  { icon: Users, title: "Band", desc: "Live bands for concerts and events" },
  { icon: Sparkles, title: "Dancer", desc: "Professional dancers and choreographers" },
  { icon: Camera, title: "Anchor", desc: "Experienced anchors and MCs" },
  { icon: Palette, title: "Comedian", desc: "Stand-up comedians for entertainment" },
  { icon: Trophy, title: "Magician", desc: "Amazing magicians for all ages" },
  { icon: Award, title: "Celebrity", desc: "Book celebrities for your events" },
];

const clients = [
  {
    name: "Uber",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png",
  },
  {
    name: "Amazon",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
  {
    name: "Google",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  },
  {
    name: "Microsoft",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  },

  {
    name: "Swiggy",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/13/Swiggy_logo.png",
  },
  {
    name: "Zomato",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/75/Zomato_logo.png",
  },
  {
    name: "Apple",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  },
];


const events = [
  {
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    title: "Corporate Event",
  },
  {
    image:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80",
    title: "Wedding Celebration",
  },
  {
    image:
      "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=800&q=80",
    title: "Music Concert",
  },
  {
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80",
    title: "Festival Performance",
  },
];

// trending celebrity images (18 images - we will cycle if needed)
const trendingCelebrityImages = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?auto=format&fit=crop&w=400&q=80",
];

const videoThumbnails = [
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
];

const heroSlides = [
  "/images/slide-01.jpg",
  "/images/slide-02.jpg",
  "/images/slide-03.jpg",
];

export default function AhibiArtistPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // TODO: wire up API / toast / form reset as needed
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Banner */}
      <section
        className="relative w-full h-[180px] sm:h-[300px] lg:h-[440px] overflow-hidden bg-white"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Carousel Images */}
        {heroSlides.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`Slide ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover object-right transition-opacity duration-1000 ${idx === currentSlide ? "opacity-100" : "opacity-0"
              }`}
          />
        ))}

       

   


        {/* Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-[50%] sm:max-w-xl">
              {/* Heading */}
              <h1 className="text-[16px] sm:text-4xl lg:text-5xl font-extrabold leading-[1.05]">
                <span className="text-rose-500">Discover and book the</span>{" "}
                <span className="text-orange-500">perfect celebrity</span>{" "}
                <span className="text-rose-500">for your event!</span>
              </h1>

              {/* Paragraph */}
              <p className="mt-1.5 sm:mt-5 text-gray-700 text-[10px] sm:text-base max-w-md">
                We connect you with top-notch celebrities who will make your
                event an unforgettable success.
              </p>

              {/* Buttons */}
              <div className="mt-2.5 sm:mt-6 flex gap-2 sm:gap-4">
                <Link href="/allArtists/list">
                  <Button className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-3 sm:px-8 py-2 sm:py-6 text-[10px] sm:text-lg rounded-full shadow-xl">
                    Explore Artists
                    <ChevronRight className="ml-1 h-3 w-3 sm:h-5 sm:w-5" />
                  </Button>
                </Link>

                <Link href="/artist/auth/signup">
                  <Button
                    variant="outline"
                    className="border-2 border-rose-600 text-rose-600 px-3.5 sm:px-8 py-2 sm:py-6 text-[10px] sm:text-lg rounded-full shadow-lg"
                  >
                    List Your Talent
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

      </section>






      {/* Popular Categories */}
      <section id="artists" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Popular Categories to Explore
            </h2>
            <p className="text-xl text-gray-600">Find the perfect artist for your event</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {popularArtists.map((artist) => (
              <Card
                key={artist.id}
                className="group cursor-pointer overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="font-bold text-lg mb-1">{artist.name}</div>
                    <div className="text-sm text-gray-200">{artist.category}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">

            <Link href="/allArtists/list">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-rose-600 text-rose-600 hover:bg-rose-50 hover:text-rose-600 px-8 py-6 rounded-full text-lg shadow-lg"
              >
                View All Artists
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Business Promotion Section */}
      <section className="py-20 bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black leading-tight">
                Promote your business through us!
              </h2>
              <p className="text-xl text-rose-50 leading-relaxed">
                Join thousands of talented artists who have grown their careers with our platform.
                Get discovered by event organizers and expand your reach across the country.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Award className="h-5 w-5" />
                  </div>
                  <span className="text-lg">Verified profile and credentials</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-lg">Direct connection with organizers</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <span className="text-lg">Showcase your portfolio</span>
                </div>
              </div>
              <Button size="lg" className="bg-white text-rose-600 hover:bg-gray-100 px-8 py-6 rounded-full text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                Join Now
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="relative">
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80"
                  alt="Promote Business"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories List */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-4">
              Hire a List Celebrities for Corporate Functions
            </h2>
            <p className="text-xl text-gray-400">Professional artists for every occasion</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Card
                key={index}
                className="bg-gray-800 border-0 rounded-2xl p-6 hover:bg-gray-750 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
              >
                <CardContent className="p-0 space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <category.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl text-white font-bold mb-2">{category.title}</h3>
                    <p className="text-gray-400 text-sm">{category.desc}</p>
                  </div>
                  <div className="flex items-center text-rose-400 group-hover:text-rose-300 transition-colors">
                    <span className="text-sm font-semibold">Explore</span>
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Celebrities */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Hire Top Trending Celebrities for Corporate and Private Events
            </h2>
            <p className="text-xl text-gray-600">Premium talent for premium events</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {Array.from({ length: 18 }).map((_, i) => {
              const img = trendingCelebrityImages[i % trendingCelebrityImages.length];
              return (
                <Card
                  key={i}
                  className="group cursor-pointer overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={img}
                      alt={`Celebrity ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-3 left-3 right-3 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="font-bold text-sm">Celebrity Name</div>
                      <div className="text-xs text-gray-200">Performer</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-rose-600 text-rose-600 hover:bg-rose-50 px-8 py-6 rounded-full text-lg shadow-lg"
            >
              View All Celebrities
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Our Clients */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Our Clients
            </h2>
            <p className="text-xl text-gray-600">
              Trusted by leading brands worldwide
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center">
            {clients.map((client, index) => (
              <div
                key={index}
                className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={client.logo}
                  alt={client.name}
                  className="h-10 w-auto object-contain"
                />
              </div>

            ))}
          </div>
        </div>
      </section>


      {/* Video/Media Showcase */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500 rounded-full filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-4">
              Ahibi Spotlight: Latest Videos & Shorts
            </h2>
            <p className="text-xl text-gray-300">Watch our featured performances</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videoThumbnails.map((thumb, i) => (
              <Card
                key={i}
                className="bg-gray-800 border-0 rounded-2xl overflow-hidden group cursor-pointer hover:ring-2 hover:ring-rose-500 transition-all duration-300"
              >
                <div className="relative aspect-video bg-gray-700">
                  <img
                    src={thumb}
                    alt={`Video ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Film className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-white font-bold mb-2">Performance Highlight</h3>
                  <p className="text-gray-400 text-sm">Watch this amazing performance</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Events */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">Recent Events</h2>
            <p className="text-xl text-gray-600">A glimpse of our successful events</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event, index) => (
              <Card
                key={index}
                className="group cursor-pointer overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-bold text-lg">{event.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Recently completed</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-rose-50 to-purple-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                  Get in Touch
                </h2>
                <p className="text-xl text-gray-600">
                  Have questions? We're here to help you find the perfect artist for your event.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-rose-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 mb-1">Phone</div>
                    <div className="text-gray-600">+91 1234567890</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-rose-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 mb-1">Email</div>
                    <div className="text-gray-600">info@ahibi.in</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-rose-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 mb-1">Address</div>
                    <div className="text-gray-600">Nagaland,India</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="font-bold text-gray-900">Follow Us:</div>
                <div className="flex gap-3">
                  {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                    <a
                      key={i}
                      href="#"
                      className="w-10 h-10 rounded-full bg-rose-100 hover:bg-rose-600 flex items-center justify-center text-rose-600 hover:text-white transition-all duration-300 transform hover:scale-110"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
