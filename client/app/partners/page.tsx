"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Calendar,
  Music,
  Check,
  ArrowRight,
  Shield,
  Zap,
  Headphones,
  TrendingUp,
  Clock,
  Star,
  Users,
  Sparkles,
  BarChart3,
  Target,
  HeadphonesIcon,
} from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start group">
    <div className="flex-shrink-0 mt-1">
      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
        <Check className="h-4 w-4 text-green-600" />
      </div>
    </div>
    <p className="ml-3 text-base text-gray-700">{children}</p>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="group">
    <div className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${color} hover:scale-105 transition-transform`}>
      <div className="p-2 bg-white/90 rounded-lg">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-white/90">{label}</div>
      </div>
    </div>
  </div>
);

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Hero Section - Enhanced */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-purple-50 to-green-50 opacity-60"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-6 border border-gray-200">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">Trusted by 50,000+ Users</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
            Partner with Ahibi
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            A single platform for venues, organizers, and artists to manage, grow, and connect — seamlessly.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
            <StatCard icon={Users} label="Active Users" value="50K+" color="from-blue-500 to-blue-600" />
            <StatCard icon={Calendar} label="Events Hosted" value="30+" color="from-purple-500 to-purple-600" />
            <StatCard icon={TrendingUp} label="Tickets Sold" value="60K+" color="from-green-500 to-green-600" />
          </div>
          
        
        </div>
      </section>

      {/* Venues Section - Enhanced */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full mb-4">
                <Building className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-600 uppercase tracking-wide">For Venue Managers</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Maximize every booking.
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Simplify how you manage your space — from schedules to payments — all in one dashboard.
              </p>
              <div className="space-y-4 mb-10">
                <FeatureItem>Smart booking and availability management</FeatureItem>
                <FeatureItem>Automated payments and real-time tracking</FeatureItem>
                <FeatureItem>Revenue and performance analytics</FeatureItem>
                <FeatureItem>Customer management tools</FeatureItem>
              </div>
              <Button asChild className="bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 px-6 py-6">
                <Link href="/venue/auth/signup">
                  Start as Venue Manager
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="lg:pl-8">
              <Card className="bg-white border-gray-200 border shadow-2xl hover:shadow-3xl transition-shadow overflow-hidden">
                <CardContent className="p-8">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900 font-bold text-lg">Venue Dashboard</h3>
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Upcoming Bookings</div>
                        <div className="text-3xl font-bold text-gray-900">12</div>
                        <div className="text-xs text-green-600 mt-1">↑ 23% this month</div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Monthly Revenue</div>
                        <div className="text-3xl font-bold text-gray-900">₹45K</div>
                        <div className="text-xs text-green-600 mt-1">↑ 18% growth</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Main Hall</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Oct 15 • Music Concert
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Confirmed
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Rooftop Lounge</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Oct 18 • Private Event
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                        Pending
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Organizers Section - Enhanced */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-purple-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full mb-4">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-600 uppercase tracking-wide">For Event Organizers</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Plan better. Sell faster.
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Manage your entire event lifecycle — ticketing, marketing, analytics, and audience engagement — without juggling multiple tools.
              </p>
              <div className="space-y-4 mb-10">
                <FeatureItem>End-to-end event management</FeatureItem>
                <FeatureItem>Integrated ticketing and QR check-ins</FeatureItem>
                <FeatureItem>Audience engagement tools</FeatureItem>
                <FeatureItem>Marketing Support</FeatureItem>
                <FeatureItem>Analytics dashboard</FeatureItem>
              </div>
              <Button asChild className="bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 px-6 py-6">
                <Link href="/organizer/auth/signup">
                  Start as Organizer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="lg:order-1 lg:pr-8">
              <Card className="bg-white border-gray-200 border shadow-2xl hover:shadow-3xl transition-shadow overflow-hidden">
                <CardContent className="p-8">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900 font-bold text-lg">Event Management</h3>
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Active Events</div>
                        <div className="text-3xl font-bold text-gray-900">8</div>
                        <div className="text-xs text-purple-600 mt-1">3 starting soon</div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Tickets Sold</div>
                        <div className="text-3xl font-bold text-gray-900">2.4K</div>
                        <div className="text-xs text-green-600 mt-1">↑ 156 today</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-purple-200 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-semibold text-gray-900">Summer Music Festival</div>
                        <Badge className="bg-green-100 text-green-700 border-green-200">Live</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">85% sold</span>
                        <div className="flex items-center gap-1 text-orange-600">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-medium">Hot</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-purple-200 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-semibold text-gray-900">Tech Conference 2025</div>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Planning</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">450 interested</span>
                        <div className="flex items-center gap-1 text-blue-600">
                          <Users className="h-3 w-3" />
                          <span className="font-medium">Growing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Artists Section - Enhanced */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full mb-4">
                <Music className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-600 uppercase tracking-wide">For Artists</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Showcase. Connect. Grow.
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Build your professional portfolio, get booked directly, and track your performance in real time.
              </p>
              <div className="space-y-4 mb-10">
                <FeatureItem>Verified profile and booking system</FeatureItem>
                <FeatureItem>Fan engagement and promotions</FeatureItem>
                <FeatureItem>Revenue tracking and insights</FeatureItem>
                <FeatureItem>Performance analytics</FeatureItem>
              </div>
              <Button asChild className="bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 px-6 py-6">
                <Link href="/artist/auth/signup">
                  Start as Artist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="lg:pl-8">
              <Card className="bg-white border-gray-200 border shadow-2xl hover:shadow-3xl transition-shadow overflow-hidden">
                <CardContent className="p-8">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900 font-bold text-lg">Artist Dashboard</h3>
                      <Star className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Followers</div>
                        <div className="text-3xl font-bold text-gray-900">12.5K</div>
                        <div className="text-xs text-green-600 mt-1">↑ 340 this week</div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">This Month</div>
                        <div className="text-3xl font-bold text-gray-900">₹28K</div>
                        <div className="text-xs text-green-600 mt-1">↑ 42% growth</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-semibold text-gray-900">Live at The Junction</div>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Booked</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Oct 20, 8:00 PM
                        </span>
                        <span className="text-green-600 font-medium">₹15K</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-semibold text-gray-900">New Single Release</div>
                        <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">2.3K plays</span>
                        <div className="flex items-center gap-1 text-purple-600">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-medium">Trending</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ahibi Section - Enhanced */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Why Partners Choose Ahibi</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Technology built for simplicity, reliability, and scale — so you can focus on what you do best.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all">
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Reliable</h3>
              <p className="text-gray-600 leading-relaxed">Bank-grade security with 256-bit encryption and 99.9% uptime guarantee.</p>
            </div>
            <div className="group p-8 rounded-2xl bg-white border border-gray-200 hover:border-yellow-300 hover:shadow-xl transition-all">
              <div className="h-14 w-14 rounded-xl bg-yellow-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast & Seamless</h3>
              <p className="text-gray-600 leading-relaxed">Lightning-fast performance optimized for modern workflows and user experience.</p>
            </div>
            <div className="group p-8 rounded-2xl bg-white border border-gray-200 hover:border-green-300 hover:shadow-xl transition-all">
              <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HeadphonesIcon className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Dedicated Support</h3>
              <p className="text-gray-600 leading-relaxed">24/7 expert assistance from our dedicated partner success team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA - Enhanced */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 md:p-16 overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Let's build better events together.
              </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join a network of creators, venues, and organizers shaping the next generation of live experiences.
              </p>
              {/* <Button asChild size="lg" className="bg-white text-gray-900 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 px-8 py-6 text-lg font-semibold">
                <Link href="/auth/signup">
                  Become a Partner
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button> */}
            </div>
          </div>
        </div>
      </section>

      <Footer />
      
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}