'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Phone, Loader2, Eye, EyeOff, Shield } from 'lucide-react';

type LoginStep = 'login' | 'otp-verify' | 'set-password' | 'pending' | 'rejected';

export default function VenueLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');

  const handlePasswordLogin = async () => {
    setError('');
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid Indian phone number');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (response.status === 202) {
        setStep('pending');
      } else if (response.status === 403) {
        setStep('rejected');
      } else if (data.success) {
        localStorage.setItem('venueToken', data.data.token);
        localStorage.setItem('venueData', JSON.stringify(data.data.venue));
        toast.success(data.message);
        router.push('/venue/dashboard');
      } else {
        setError(data.message || 'Failed to login');
      }
    } catch (error) {
      console.error('Password login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setError('');
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid Indian phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/send-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.status === 202) {
        setStep('pending');
      } else if (response.status === 403) {
        setStep('rejected');
      } else if (data.success) {
        setStep('otp-verify');
        toast.success('OTP sent successfully!');
        if (data.devMode && data.otp) {
          console.log('Development OTP:', data.otp);
        }
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (response.status === 202) {
        setStep('pending');
      } else if (response.status === 403) {
        setStep('rejected');
      } else if (data.success) {
        setTempToken(data.data.token);
        if (isPasswordReset) {
          setStep('set-password');
        } else {
          localStorage.setItem('venueToken', data.data.token);
          localStorage.setItem('venueData', JSON.stringify(data.data.venue));
          toast.success(data.message);
          router.push('/venue/dashboard');
        }
      } else {
        setError(data.message || 'Failed to verify OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/venue/auth/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('venueToken', tempToken);
        toast.success('Password updated! Redirecting...');
        router.push('/venue/dashboard');
      } else {
        setError(data.message || 'Failed to set password');
      }
    } catch (error) {
      console.error('Set password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Venue Sign In
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'login' && 'Venue Sign In'}
              {step === 'otp-verify' && (isPasswordReset ? 'Reset Password' : 'Verify OTP')}
              {step === 'set-password' && (isPasswordReset ? 'Set New Password' : 'Set Your Password')}
              {step === 'pending' && 'Account Pending'}
              {step === 'rejected' && 'Account Rejected'}
            </CardTitle>
            <CardDescription>
              {step === 'login' && 'Sign in to your venue dashboard'}
              {step === 'otp-verify' && `OTP sent to ${phone}`}
              {step === 'set-password' && (isPasswordReset ? 'Create a new password for your account' : 'Set a password to speed up future logins')}
              {step === 'pending' && 'Your account is pending admin approval'}
              {step === 'rejected' && 'Your account has been rejected'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === 'login' && (
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {error}
                  </div>
                )}

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

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordLogin}
                  disabled={isLoading || !phone}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign In
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
                        setError('Please enter your phone number first');
                        return;
                      }
                      setIsPasswordReset(true);
                      await handleSendOTP();
                    }}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot password? Reset via OTP
                  </button>
                </div>
              </div>
            )}

            {step === 'set-password' && (
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>

                <Button onClick={handleSetPassword} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Password & Continue
                </Button>
              </div>
            )}

            {step === 'otp-verify' && (
              <div className="space-y-4">
                <div className="text-center">
                  <Phone className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                  <p className="text-gray-600">OTP sent to {phone}</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {error}
                  </div>
                )}

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
                  <Button variant="outline" onClick={() => { setStep('login'); setOtp(''); setError(''); }}>
                    Back
                  </Button>
                  <Button variant="link" onClick={handleSendOTP} disabled={isLoading}>
                    Resend OTP
                  </Button>
                </div>
              </div>
            )}

            {step === 'pending' && (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-yellow-100 border border-yellow-300 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Account Pending Approval</h3>
                  <p className="text-gray-500 mt-2">
                    Your venue account is currently under review by our admin team. You will be notified once approved.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setStep('login')}>
                  Back to Sign In
                </Button>
              </div>
            )}

            {step === 'rejected' && (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-red-100 border border-red-300 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Account Rejected</h3>
                  <p className="text-gray-500 mt-2">
                    Your venue account has been rejected. Please contact support for more information.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setStep('login')}>
                  Back to Sign In
                </Button>
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
