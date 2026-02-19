'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building, Phone, Loader2 } from 'lucide-react';

export default function VenueLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const handlePasswordLogin = async () => {
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Please enter a valid Indian phone number');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Please enter a valid password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem('venueToken', data.data.token);
        localStorage.setItem('venueData', JSON.stringify(data.data.venue));
        
        toast.success(data.message);
        router.push('/venue/dashboard');
      } else {
        toast.error(data.message || 'Failed to login');
      }
    } catch (error) {
      console.error('Password login error:', error);
      toast.error('Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Please enter a valid Indian phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/send-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        setShowOTP(true);
        toast.success(data.message);
        if (data.devMode && data.otp) {
          console.log('Development OTP:', data.otp);
        }
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/verify-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          otp
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem('venueToken', data.data.token);
        localStorage.setItem('venueData', JSON.stringify(data.data.venue));
        
        toast.success(data.message);
        router.push('/venue/dashboard');
      } else {
        toast.error(data.message || 'Failed to verify OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error('Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setShowOTP(false);
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/images/LogoB.png" 
              alt="AHIBI Logo" 
              className="h-16 w-auto"
            />
          </div>
          {/* <Building className="mx-auto h-12 w-12 text-blue-600 mb-4" /> */}
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Venue Sign In
          </h2>
        
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {showOTP ? 'Verify OTP' : 'Venue Sign In'}
            </CardTitle>
            <CardDescription>
              {showOTP ? 'Enter the OTP sent to your phone' : 'Choose your sign in method'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!showOTP && (
              <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setLoginMethod('otp')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    loginMethod === 'otp'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  OTP Login
                </button>
                <button
                  onClick={() => setLoginMethod('password')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    loginMethod === 'password'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Password Login
                </button>
              </div>
            )}

            {!showOTP ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit phone number"
                    maxLength={10}
                  />
                </div>
                
                {loginMethod === 'password' && (
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                )}
                
                <Button
                  onClick={loginMethod === 'password' ? handlePasswordLogin : handleSendOTP}
                  disabled={isLoading || !phone || (loginMethod === 'password' && (!password || password.length < 6))}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loginMethod === 'password' ? 'Sign In' : 'Send OTP'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Phone className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                  <p className="text-gray-600">
                    OTP sent to {phone}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="text-center text-lg"
                  />
                </div>
                
                <Button
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.length !== 6}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verify OTP & Sign In
                </Button>
                
                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={handleBackToPhone}>
                    Back
                  </Button>
                  
                  <Button variant="link" onClick={handleSendOTP} disabled={isLoading}>
                    Resend OTP
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/venue/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
