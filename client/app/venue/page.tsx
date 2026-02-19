'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Calendar, Users, DollarSign, ArrowRight } from 'lucide-react';

export default function VenuePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('venueToken');
    if (token) {
      router.push('/venue/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src="/images/LogoB.png" 
                alt="AHIBI Logo" 
                className="h-20 w-auto"
              />
            </div>
            <Building className="mx-auto h-16 w-16 text-blue-600 mb-6" />
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Venue Partner Portal
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-500">
              Join our platform and connect with thousands of event organizers. 
              Manage your venue, accept bookings, and grow your business.
            </p>
            <div className="mt-10 flex justify-center space-x-4">
              <Link href="/venue/auth/signup">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Register Your Venue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/venue/auth/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Why Partner With Us?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Everything you need to manage your venue successfully
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center">
              <CardHeader>
                <Calendar className="mx-auto h-12 w-12 text-blue-600" />
                <CardTitle>Easy Booking Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage all your bookings in one place with our intuitive calendar system
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="mx-auto h-12 w-12 text-blue-600" />
                <CardTitle>Reach More Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get discovered by thousands of event organizers looking for venues
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <DollarSign className="mx-auto h-12 w-12 text-blue-600" />
                <CardTitle>Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automated payment processing with secure transactions and instant payouts
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Building className="mx-auto h-12 w-12 text-blue-600" />
                <CardTitle>Venue Showcase</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Display your venue with photos, amenities, and detailed information
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white">
              Ready to Grow Your Venue Business?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Join hundreds of successful venue partners on our platform
            </p>
            <div className="mt-8">
              <Link href="/venue/auth/signup">
                <Button size="lg" variant="secondary">
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 AHIBI Venue Partners. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
