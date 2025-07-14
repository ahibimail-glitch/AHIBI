"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Ticket,
  Building,
  Calendar,
  Music,
  Users,
  TrendingUp,
  Star,
  Check,
  ArrowRight,
  Clock,
  Shield,
  Zap,
  HeadphonesIcon,
} from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import { Header } from "@radix-ui/react-accordion";
import Navbar from "../Navbar";

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
              Partner with Ahibi
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Join thousands of venue managers, event organizers, and artists who
            are transforming the entertainment industry with our comprehensive
            platform.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <Building className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  2,500+
                </div>
                <div className="text-gray-600">Active Venues</div>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  15,000+
                </div>
                <div className="text-gray-600">Events Organized</div>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <Music className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  8,000+
                </div>
                <div className="text-gray-600">Professional Artists</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Venue Manager Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-100/50 to-red-100/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mr-4">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">
                    Venue Managers
                  </h2>
                  <p className="text-gray-600">
                    Maximize your venue's potential
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Advanced booking management system
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Real-time availability tracking
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Automated payment processing
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Revenue optimization tools
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Customer relationship management
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 shadow-lg"
                >
                  <Link href="/venue/auth/signup">
                    Start as Venue Manager
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent"
                >
                  <Link href="/venue/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>

            <div className="lg:pl-8">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-4 mb-4">
                    <h3 className="text-white font-semibold mb-2">
                      Venue Dashboard
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-white text-sm">
                      <div>
                        <div className="opacity-80">Today's Bookings</div>
                        <div className="text-2xl font-bold">12</div>
                      </div>
                      <div>
                        <div className="opacity-80">Monthly Revenue</div>
                        <div className="text-2xl font-bold">$24.5K</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          Main Hall
                        </div>
                        <div className="text-sm text-gray-600">
                          Wedding Reception
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Confirmed
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          Conference Room A
                        </div>
                        <div className="text-sm text-gray-600">
                          Corporate Meeting
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        In Progress
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          Outdoor Space
                        </div>
                        <div className="text-sm text-gray-600">
                          Music Festival
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
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

      {/* Event Organizer Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-100/50 to-pink-100/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">
                    Event Organizers
                  </h2>
                  <p className="text-gray-600">
                    Create unforgettable experiences
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    End-to-end event management
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Integrated ticketing system
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Attendee engagement tools
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Marketing automation</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Real-time analytics dashboard
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 shadow-lg"
                >
                  <Link href="/organizer/auth/signup">
                    Start as Organizer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 bg-transparent"
                >
                  <Link href="/organizer/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>

            <div className="lg:order-1 lg:pr-8">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-4 mb-4">
                    <h3 className="text-white font-semibold mb-2">
                      Event Management
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-white text-sm">
                      <div>
                        <div className="opacity-80">Active Events</div>
                        <div className="text-2xl font-bold">8</div>
                      </div>
                      <div>
                        <div className="opacity-80">Total Attendees</div>
                        <div className="text-2xl font-bold">2.1K</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">
                          Summer Music Festival
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Live
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Central Park • 500 attendees
                      </div>
                      <div className="flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">95% capacity</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">
                          Tech Conference 2024
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          Planning
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Convention Center • 1200 expected
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-blue-600">30 days to go</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Artist Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-100/50 to-teal-100/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mr-4">
                  <Music className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">
                    Artists
                  </h2>
                  <p className="text-gray-600">
                    Showcase your talent to the world
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Professional portfolio builder
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Direct booking system</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Fan engagement platform</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Revenue tracking & analytics
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">
                    Promotional support tools
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-green-500 to-teal-600 hover:opacity-90 shadow-lg"
                >
                  <Link href="/artist/auth/signup">
                    Start as Artist
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="border-green-300 text-green-700 hover:bg-green-50 bg-transparent"
                >
                  <Link href="/artist/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>

            <div className="lg:pl-8">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-lg p-4 mb-4">
                    <h3 className="text-white font-semibold mb-2">
                      Artist Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-white text-sm">
                      <div>
                        <div className="opacity-80">Followers</div>
                        <div className="text-2xl font-bold">12.5K</div>
                      </div>
                      <div>
                        <div className="opacity-80">This Month</div>
                        <div className="text-2xl font-bold">$8.2K</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">
                          Jazz Night Performance
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm text-gray-600">4.9</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Blue Note Club • $1,200
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">
                          Wedding Reception
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-sm text-gray-600">150</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Grand Ballroom • $2,500
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        Upcoming
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Why Choose Ahibi?
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Join the platform that's revolutionizing the entertainment industry
            with cutting-edge technology and unmatched support.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Secure & Reliable
                </h3>
                <p className="text-gray-600">
                  Bank-level security with 99.9% uptime guarantee
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Lightning Fast
                </h3>
                <p className="text-gray-600">
                  Optimized performance for seamless user experience
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <HeadphonesIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  24/7 Support
                </h3>
                <p className="text-gray-600">
                  Dedicated support team ready to help you succeed
                </p>
              </CardContent>
            </Card>
          </div>

          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shadow-lg text-lg px-8 py-3"
          >
            {/* <Link href="/auth">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link> */}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
