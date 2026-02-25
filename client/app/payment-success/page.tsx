'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../Navbar';
import Footer from '../Footer';

interface PaymentDetails {
  amount: number;
  paymentId: string;
  orderId: string;
  timestamp: string;
  type: 'livestream' | 'event' | 'venue' | 'sports';
  itemName: string;
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchParams) {
      setLoading(false);
      return;
    }

    // Extract payment details from URL parameters
    const amount = searchParams.get('amount');
    const paymentId = searchParams.get('payment_id');
    const orderId = searchParams.get('order_id');
    const type = searchParams.get('type') || 'livestream';
    const itemName = searchParams.get('item_name');

    if (amount && paymentId && orderId) {
      setPaymentDetails({
        amount: parseFloat(amount),
        paymentId,
        orderId,
        timestamp: new Date().toISOString(),
        type: type as PaymentDetails['type'],
        itemName: itemName || 'Purchase'
      });
    }
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Your purchase has been completed successfully
          </p>
        </div>

        {/* Payment Details Card */}
        {paymentDetails && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Purchase Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Item</p>
                <p className="text-lg font-medium text-gray-900">{paymentDetails.itemName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
                <p className="text-lg font-medium text-gray-900">₹{paymentDetails.amount.toLocaleString()}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment ID</p>
                <p className="text-lg font-medium text-gray-900">{paymentDetails.paymentId}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <p className="text-lg font-medium text-gray-900">{paymentDetails.orderId}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(paymentDetails.timestamp).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Type</p>
                <p className="text-lg font-medium text-gray-900 capitalize">{paymentDetails.type}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* View Profile Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">View Your Profile</h3>
                <p className="text-gray-600 mb-4">
                  Your purchase details are available in your profile. Go there to view all your bookings and purchase history.
                </p>
                <Link 
                  href="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Profile
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Continue Shopping Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Continue Exploring</h3>
                <p className="text-gray-600 mb-4">
                  Discover more events, livestreams, and venues available on AHIBI.
                </p>
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Browse Events
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Important Information</h4>
              <p className="text-amber-800 text-sm">
                Your purchase details and access information have been saved to your profile. 
                You can access them anytime by visiting your profile page. 
                A confirmation email has also been sent to your registered email address.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
