'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerAuth } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';

type AuthStep = 'phone' | 'otp' | 'details' | 'set-password' | 'pending' | 'rejected';

export default function ArenaPartnerAuth() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [step, setStep] = useState<AuthStep>('phone');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        phone: '',
        otp: '',
        name: '',
        email: '',
        businessName: '',
    });

    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isPasswordReset, setIsPasswordReset] = useState(false);
    const [tempToken, setTempToken] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        try {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('arenaPartnerToken');
            localStorage.removeItem('token');
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('arenaPartnerToken');
            sessionStorage.removeItem('token');
        } catch (e) {
            // no-op
        }
    }, []);

    const resetToLogin = () => {
        setMode('login');
        setStep('phone');
        setErrorMsg('');
        setPassword('');
        setIsPasswordReset(false);
        setTempToken('');
    };

    // ── LOGIN: password login ──────────────────────────────────────
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const phone = formData.phone.trim();
        if (!/^[0-9]{10}$/.test(phone)) {
            setErrorMsg('Please enter a valid 10-digit phone number');
            return;
        }
        if (!password || password.length < 6) {
            setErrorMsg('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/arena-partner/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });
            const data = await res.json();
            if (res.status === 202) {
                setStep('pending');
            } else if (res.status === 403) {
                setStep('rejected');
            } else if (res.ok && data.success) {
                localStorage.setItem('arenaPartnerToken', data.data.token);
                toast.success('Login successful');
                router.push('/arena-partner/dashboard');
            } else if (data.requiresOtp) {
                setErrorMsg('No password set. Use "Forgot password?" below to set one via OTP.');
            } else {
                setErrorMsg(data.message || 'Login failed');
            }
        } catch {
            setErrorMsg('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── LOGIN: send OTP (forgot password) ─────────────────────────
    const sendLoginOtp = async (phone: string) => {
        setErrorMsg('');
        setLoading(true);
        try {
            await arenaPartnerAuth.sendOtp(phone, 'login');
            toast.success('OTP sent successfully');
            setStep('otp');
        } catch (error: any) {
            const msg = error?.response?.data?.message
                || (error?.request ? 'Server unavailable. Please try again.' : error?.message)
                || 'Failed to send OTP';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── LOGIN: verify OTP (password reset only) ───────────────────
    const handleLoginOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const phone = formData.phone.trim();
        const otp = formData.otp.trim();
        if (!/^[0-9]{6}$/.test(otp)) {
            setErrorMsg('Please enter the 6-digit OTP');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/arena-partner/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, mode: 'login' }),
            });
            const data = await res.json();
            if (res.status === 202) {
                setStep('pending');
            } else if (res.status === 403) {
                setStep('rejected');
            } else if (res.ok && data.success) {
                setTempToken(data.data.token);
                setStep('set-password');
            } else {
                setErrorMsg(data.message || 'Invalid OTP');
            }
        } catch {
            setErrorMsg('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── LOGIN: set / reset password ───────────────────────────────
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (newPassword.length < 6) {
            setErrorMsg('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/arena-partner/auth/setup-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tempToken}`,
                },
                body: JSON.stringify({ password: newPassword }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                localStorage.setItem('arenaPartnerToken', tempToken);
                toast.success('Password set! Redirecting...');
                router.push('/arena-partner/dashboard');
            } else {
                setErrorMsg(data.message || 'Failed to set password');
            }
        } catch {
            setErrorMsg('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── SIGNUP: send OTP ──────────────────────────────────────────
    const handleSendSignupOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const phone = formData.phone.trim();
        if (!/^[0-9]{10}$/.test(phone)) {
            setErrorMsg('Please enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            await arenaPartnerAuth.sendOtp(phone, 'signup');
            toast.success('OTP sent successfully');
            setStep('otp');
        } catch (error: any) {
            const msg = error?.response?.data?.message
                || (error?.request ? 'Server unavailable. Please try again.' : error?.message)
                || 'Failed to send OTP';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── SIGNUP: verify OTP → details ──────────────────────────────
    const handleSignupOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[0-9]{6}$/.test((formData.otp || '').trim())) {
            toast.error('Please enter the 6-digit OTP');
            return;
        }
        setStep('details');
    };

    // ── SIGNUP: complete registration ─────────────────────────────
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[0-9]{6}$/.test((formData.otp || '').trim())) {
            toast.error('Please enter the 6-digit OTP');
            return;
        }
        if (!formData.name?.trim()) { toast.error('Please enter your name'); return; }
        const email = (formData.email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Please enter a valid email address'); return; }
        if (!formData.businessName?.trim()) { toast.error('Please enter your business/venue name'); return; }

        setLoading(true);
        try {
            const response = await arenaPartnerAuth.verifyOtp({
                phone: formData.phone.trim(),
                otp: formData.otp.trim(),
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

    const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base';
    const btnCls = 'w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl active:scale-95';

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
                <div className="text-center mb-6 sm:mb-8">
                    <div className="flex justify-center mb-3 sm:mb-4">
                        <Image
                            src="/images/AhibiSportsB.png"
                            alt="Ahibi"
                            width={140}
                            height={140}
                            priority
                            className="object-contain w-32 h-32 sm:w-40 sm:h-40"
                        />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Arena Partner Portal</h1>
                    <p className="text-sm sm:text-base text-gray-600">
                        {mode === 'login' && step === 'phone' && 'Welcome back!'}
                        {step === 'otp' && 'Enter the OTP sent to your phone'}
                        {step === 'set-password' && 'Set a new password for your account'}
                        {step === 'details' && 'Complete your registration'}
                        {step === 'pending' && 'Account under review'}
                        {step === 'rejected' && 'Account rejected'}
                        {mode === 'signup' && step === 'phone' && 'Join Ahibi Sports'}
                    </p>
                </div>

                {/* Mode Toggle — only show on login/signup phone step */}
                {step === 'phone' && (
                    <div className="flex gap-2 mb-5 sm:mb-6 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => { setMode('login'); setErrorMsg(''); }}
                            className={`flex-1 py-2 rounded-md font-medium transition-all text-sm sm:text-base ${mode === 'login' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setMode('signup'); setErrorMsg(''); }}
                            className={`flex-1 py-2 rounded-md font-medium transition-all text-sm sm:text-base ${mode === 'signup' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}
                        >
                            Sign Up
                        </button>
                    </div>
                )}

                {/* Error message */}
                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {errorMsg}
                    </div>
                )}

                {/* ── LOGIN: Password form ── */}
                {mode === 'login' && step === 'phone' && (
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Enter 10-digit phone number"
                                maxLength={10}
                                required
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className={`${inputCls} pr-12`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className={btnCls}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                        <div className="text-center">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={async () => {
                                    const phone = formData.phone.trim();
                                    if (!/^[0-9]{10}$/.test(phone)) {
                                        setErrorMsg('Please enter your phone number first');
                                        return;
                                    }
                                    setIsPasswordReset(true);
                                    await sendLoginOtp(phone);
                                }}
                                className="text-sm text-orange-600 hover:underline font-medium"
                            >
                                Forgot password? Reset via OTP
                            </button>
                        </div>
                    </form>
                )}

                {/* ── LOGIN: OTP verify (password reset) ── */}
                {mode === 'login' && step === 'otp' && (
                    <form onSubmit={handleLoginOtpVerify} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                            <input
                                type="text"
                                value={formData.otp}
                                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                required
                                className={`${inputCls} text-center text-xl tracking-widest`}
                            />
                            <p className="text-xs text-gray-500 mt-2">OTP sent to {formData.phone}</p>
                        </div>
                        <button type="submit" disabled={loading || formData.otp.length !== 6} className={btnCls}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button type="button" onClick={resetToLogin} className="w-full text-orange-600 py-2 text-sm hover:underline font-medium">
                            Back to Login
                        </button>
                    </form>
                )}

                {/* ── LOGIN: Set / reset password ── */}
                {step === 'set-password' && (
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    required
                                    className={`${inputCls} pr-12`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                required
                                className={inputCls}
                            />
                        </div>
                        <button type="submit" disabled={loading} className={btnCls}>
                            {loading ? 'Saving...' : 'Save Password & Continue'}
                        </button>
                    </form>
                )}

                {/* ── PENDING ── */}
                {step === 'pending' && (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-yellow-100 border border-yellow-300 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">⏳</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Account Pending Approval</h3>
                        <p className="text-gray-500 text-sm">Your arena partner account is currently under review by our admin team. You will be notified once approved.</p>
                        <button onClick={resetToLogin} className={btnCls}>Back to Login</button>
                    </div>
                )}

                {/* ── REJECTED ── */}
                {step === 'rejected' && (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-red-100 border border-red-300 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">✗</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Account Rejected</h3>
                        <p className="text-gray-500 text-sm">Your arena partner account has been rejected. Please contact support for more information.</p>
                        <button onClick={resetToLogin} className={btnCls}>Back to Login</button>
                    </div>
                )}

                {/* ── SIGNUP: Phone → send OTP ── */}
                {mode === 'signup' && step === 'phone' && (
                    <form onSubmit={handleSendSignupOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Enter 10-digit phone number"
                                maxLength={10}
                                required
                                className={inputCls}
                            />
                        </div>
                        <button type="submit" disabled={loading || formData.phone.length !== 10} className={btnCls}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {/* ── SIGNUP: OTP verify ── */}
                {mode === 'signup' && step === 'otp' && (
                    <form onSubmit={handleSignupOtpVerify} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                            <input
                                type="text"
                                value={formData.otp}
                                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                required
                                className={`${inputCls} text-center text-xl tracking-widest`}
                            />
                            <p className="text-xs text-gray-500 mt-2">OTP sent to {formData.phone}</p>
                        </div>
                        <button type="submit" disabled={loading || formData.otp.length !== 6} className={btnCls}>
                            {loading ? 'Verifying...' : 'Continue'}
                        </button>
                        <button type="button" onClick={() => setStep('phone')} className="w-full text-orange-600 py-2 text-sm hover:underline font-medium">
                            Change Phone Number
                        </button>
                    </form>
                )}

                {/* ── SIGNUP: Details ── */}
                {mode === 'signup' && step === 'details' && (
                    <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter your full name" required className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="your@email.com" required className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business/Venue Name</label>
                            <input type="text" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} placeholder="Enter your business name" required className={inputCls} />
                        </div>
                        <button type="submit" disabled={loading} className={btnCls}>
                            {loading ? 'Creating Account...' : 'Complete Registration'}
                        </button>
                        <button type="button" onClick={() => setStep('otp')} className="w-full text-orange-600 py-2 text-sm hover:underline font-medium">
                            Back
                        </button>
                    </form>
                )}

                {/* Footer */}
                <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500">
                    <p>
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="text-orange-600 hover:underline">Terms of Service</a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-orange-600 hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
