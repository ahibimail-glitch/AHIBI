'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerAuth } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function ArenaPartnerAuth() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        phone: '',
        otp: '',
        name: '',
        email: '',
        businessName: '',
    });

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        // Client-side validation
        const phone = (formData.phone || '').trim();
        if (!/^[0-9]{10}$/.test(phone)) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);

        try {
            await arenaPartnerAuth.sendOtp(phone, mode);
            toast.success('OTP sent successfully');
            setStep('otp');
        } catch (error: any) {
            const msg = error?.response?.data?.message
                || (error?.request ? 'Server unavailable. Please try again.' : error?.message)
                || 'Failed to send OTP';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'signup') {
            // Move to details; OTP will be verified during signup submit
            if (!/^[0-9]{6}$/.test((formData.otp || '').trim())) {
                toast.error('Please enter the 6-digit OTP');
                return;
            }
            setStep('details');
            return;
        }

        setLoading(true);
        try {
            const response = await arenaPartnerAuth.verifyOtp({
                phone: (formData.phone || '').trim(),
                otp: (formData.otp || '').trim(),
                mode,
            });

            localStorage.setItem('arenaPartnerToken', response.data.data.token);
            toast.success('Login successful');
            router.push('/arena-partner/dashboard');
        } catch (error: any) {
            const msg = error?.response?.data?.message
                || (error?.request ? 'Server unavailable. Please try again.' : error?.message)
                || 'Invalid OTP';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validations with toasts
        if (!/^[0-9]{6}$/.test((formData.otp || '').trim())) {
            toast.error('Please enter the 6-digit OTP');
            return;
        }
        if (!formData.name?.trim()) {
            toast.error('Please enter your name');
            return;
        }
        const email = (formData.email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!formData.businessName?.trim()) {
            toast.error('Please enter your business/venue name');
            return;
        }

        setLoading(true);

        try {
            const response = await arenaPartnerAuth.verifyOtp({
                phone: (formData.phone || '').trim(),
                otp: (formData.otp || '').trim(),
                mode: 'signup',
                name: formData.name.trim(),
                email,
                businessName: formData.businessName.trim(),
            });

            localStorage.setItem('arenaPartnerToken', response.data.data.token);
            toast.success('Registration successful');
            router.push('/arena-partner/dashboard');
        } catch (error: any) {
            const msg = error?.response?.data?.message
                || (error?.request ? 'Server unavailable. Please try again.' : error?.message)
                || 'Registration failed';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Image
                            src="/images/LogoB.png"
                            alt="Ahibi"
                            width={160}
                            height={160}
                            priority
                            className=" object-contain"
                        />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Arena Partner Portal
                    </h1>
                    <p className="text-gray-600">
                        {mode === 'login' ? 'Welcome back!' : 'Join Ahibi Sports'}
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => {
                            setMode('login');
                            setStep('phone');
                        }}
                        className={`flex-1 py-2 rounded-md font-medium transition-all ${mode === 'login'
                                ? 'bg-white text-orange-600 shadow-sm'
                                : 'text-gray-600'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => {
                            setMode('signup');
                            setStep('phone');
                        }}
                        className={`flex-1 py-2 rounded-md font-medium transition-all ${mode === 'signup'
                                ? 'bg-white text-orange-600 shadow-sm'
                                : 'text-gray-600'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Phone Step */}
                {step === 'phone' && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                placeholder="Enter 10-digit phone number"
                                maxLength={10}
                                pattern="[0-9]{10}"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || formData.phone.length !== 10}
                            className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {/* OTP Step */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                value={formData.otp}
                                onChange={(e) =>
                                    setFormData({ ...formData, otp: e.target.value })
                                }
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                pattern="[0-9]{6}"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-2xl tracking-widest"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                OTP sent to {formData.phone}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || formData.otp.length !== 6}
                            className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Verifying...' : mode === 'signup' ? 'Continue' : 'Login'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('phone')}
                            className="w-full text-orange-600 py-2 text-sm hover:underline"
                        >
                            Change Phone Number
                        </button>
                    </form>
                )}

                {/* Details Step (Signup Only) */}
                {step === 'details' && mode === 'signup' && (
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="Enter your full name"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                placeholder="your@email.com"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Business/Venue Name
                            </label>
                            <input
                                type="text"
                                value={formData.businessName}
                                onChange={(e) =>
                                    setFormData({ ...formData, businessName: e.target.value })
                                }
                                placeholder="Enter your business name"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Creating Account...' : 'Complete Registration'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('otp')}
                            className="w-full text-orange-600 py-2 text-sm hover:underline"
                        >
                            Back
                        </button>
                    </form>
                )}

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="text-orange-600 hover:underline">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-orange-600 hover:underline">
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
