'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Heart, Users, TrendingUp, Gift } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/app/Navbar';
import Footer from '@/app/Footer';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface DonationStats {
  totalAmount: number;
  totalDonations: number;
  averageDonation: number;
  recentDonations: Array<{
    donorName: string;
    amount: number;
    date: string;
  }>;
}

export default function TheAwakeningDonation() {
  const [donorName, setDonorName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DonationStats | null>(null);

  const predefinedAmounts = [100, 500, 1000, 2000, 5000, 10000];

  useEffect(() => {
    loadRazorpayScript();
    fetchDonationStats();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchDonationStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/donations/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching donation stats:', error);
    }
  };

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount(value);
  };

  const handleDonate = async () => {
    if (!donorName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const donationAmount = parseFloat(amount);
    if (!donationAmount || donationAmount < 1) {
      toast.error('Please enter a valid donation amount (minimum ₹1)');
      return;
    }

    setIsLoading(true);

    try {
      // Create donation order
      const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/donations/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donorName: isAnonymous ? 'Anonymous' : donorName,
          email: email || undefined,
          phone: phone || undefined,
          amount: donationAmount,
          message: message || undefined,
          isAnonymous,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create donation order');
      }

      // Initialize Razorpay payment
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'The Awakening',
        description: 'Support The Awakening Initiative',
        order_id: orderData.data.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/donations/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success('Thank you for your generous donation! 🙏');
              // Reset form
              setDonorName('');
              setEmail('');
              setPhone('');
              setAmount('');
              setCustomAmount('');
              setMessage('');
              setIsAnonymous(false);
              // Refresh stats
              fetchDonationStats();
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          name: isAnonymous ? 'Anonymous' : donorName,
          email: email || '',
          contact: phone || '',
        },
        theme: {
          color: '#FF6B35',
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
            toast.error('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Donation error:', error);
      toast.error(error.message || 'Failed to process donation');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
      {/* Hero Section */}
      <Navbar />
      <section className="relative w-full bg-white">
              
                  <div className="relative w-full h-[180px] sm:h-[250px] md:h-[350px] lg:h-[450px] overflow-hidden">
                    <Image
                      src={("https://res.cloudinary.com/dovc3lfgz/image/upload/v1769674375/ahibi/hero/mobile/mrthfstoprok3cnztqya.jpg")}
                      
                      alt="Events Hero"
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  </div>
                
              </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Donation Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Make a Donation</h2>

              {/* Amount Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Amount
                </label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {predefinedAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleAmountSelect(amt)}
                      className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${amount === amt.toString()
                          ? 'border-orange-600 bg-orange-50 text-orange-600'
                          : 'border-gray-300 hover:border-orange-400'
                        }`}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-600 focus:outline-none"
                />
              </div>

              {/* Donor Information */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={isAnonymous}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-600 focus:outline-none disabled:bg-gray-100"
                  />
                </div>


              </div>

              {/* Donate Button */}
              <button
                onClick={handleDonate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-pink-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-orange-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5" />
                    Donate Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Impact Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Our Impact
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Community Support</div>
                    <div className="text-sm text-gray-600">Empowering local communities</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Direct Impact</div>
                    <div className="text-sm text-gray-600">100% goes to the cause</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Gift className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Transparent</div>
                    <div className="text-sm text-gray-600">Full accountability</div>
                  </div>
                </div>
              </div>
            </div>

        
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
