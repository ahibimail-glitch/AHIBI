'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building, Phone, Mail, MapPin, Users, Square, DollarSign, Clock, Loader2 } from 'lucide-react';

interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
}

export default function VenueSignup() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [signupData, setSignupData] = useState<SignupData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    contactPerson: {
      name: '',
      phone: '',
      email: ''
    }
  });

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSignupData(prev => {
        const parentObj = prev[parent as keyof SignupData] as any;
        return {
          ...prev,
          [parent]: {
            ...parentObj,
            [child]: value
          }
        };
      });
    } else {
      setSignupData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateForm = () => {
    if (!signupData.name || !signupData.businessName || !signupData.email || !signupData.phone || !signupData.password) {
      toast.error('Please fill all required fields');
      return false;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (signupData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(signupData.phone)) {
      toast.error('Please enter a valid Indian phone number');
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/send-signup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
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
      const response = await fetch('/api/venue/auth/verify-signup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: signupData.phone,
          otp
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token
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

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Your Name *</Label>
        <Input
          id="name"
          value={signupData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter your full name"
        />
      </div>
      
      <div>
        <Label htmlFor="businessName">Venue Name *</Label>
        <Input
          id="businessName"
          value={signupData.businessName}
          onChange={(e) => handleInputChange('businessName', e.target.value)}
          placeholder="Enter your venue name"
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={signupData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="Enter your email"
        />
      </div>
      
      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          value={signupData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="Enter 10-digit phone number"
          maxLength={10}
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={signupData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          placeholder="Min 6 characters"
        />
      </div>
      
      <div>
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={signupData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          placeholder="Re-enter password"
        />
      </div>
    </div>
  );

  const renderOTPStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Phone className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold">Verify Your Phone</h3>
        <p className="text-gray-600 mt-2">
          We've sent a 6-digit OTP to {signupData.phone}
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
        Verify OTP & Complete Signup
      </Button>
      
      <p className="text-center text-sm text-gray-600">
        Didn't receive OTP?{' '}
        <Button variant="link" onClick={handleSendOTP} disabled={isLoading}>
          Resend OTP
        </Button>
      </p>
    </div>
  );

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
            Register Your Venue
          </h2>
          
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {showOTP ? 'Verify OTP' : 'Create Your Venue Account'}
            </CardTitle>
            <CardDescription>
              {showOTP ? 'Enter the OTP sent to your phone' : 'Fill in your personal information to get started'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {!showOTP ? (
              <>
                {renderStep1()}
                
                <div className="mt-6">
                  <Button onClick={handleSendOTP} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send OTP & Continue
                  </Button>
                </div>
              </>
            ) : (
              renderOTPStep()
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/venue/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
