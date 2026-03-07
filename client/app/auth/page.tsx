"use client";

import type React from "react";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Ticket,
  Phone,
  Shield,
  User,
  Building,
  Music,
  Calendar,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { PasswordSetupModal } from "@/components/ui/password-setup-modal";
import { PasswordResetModal } from "@/components/ui/password-reset-modal";
import { getSafeRedirectUrl } from "@/utils/redirectUtils";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'));
  
  const [mode, setMode] = useState<"login" | "signup" | "otp-login">("login");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [loginData, setLoginData] = useState({
    loginId: "",
    password: ""
  });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    agreeToTerms: false,
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false);
  const [currentToken, setCurrentToken] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "password" | "otp">("phone");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          phone: signupData.phone.trim(),
          city: signupData.city,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to create account");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", data.data.token);
      if (rememberMe) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem("tokenExpiry", expiryDate.toISOString());
      }
      window.location.href = redirectUrl;
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage(""); // Clear any previous messages
    
    console.log('Phone submission:', { 
      phone: loginData.loginId, 
      phoneLength: loginData.loginId.length,
      phoneType: typeof loginData.loginId 
    });
    
    // Trim the phone number to remove any whitespace
    const trimmedPhone = loginData.loginId.trim();
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: trimmedPhone
        })
      });
      
      const data = await res.json();
      console.log('Check user response:', { status: res.status, data });
      
      if (!res.ok || !data.success) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }
      
      localStorage.setItem("token", data.data.token);
      if (rememberMe) {
        // Set token to expire in 30 days
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem("tokenExpiry", expiryDate.toISOString());
      }
      window.location.href = redirectUrl;
      setLoading(false);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const sendOtpForLogin = async (phone: string) => {
    setSendingOtp(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode: 'login' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to send OTP");
        return;
      }
      setError(""); // Clear any previous errors
      setSuccessMessage("OTP sent successfully! Check your phone.");
    } catch (err) {
      setError("Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handlePasswordSetup = async (password: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/setup-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to set password");
      }

      localStorage.setItem("token", currentToken);
      if (rememberMe) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem("tokenExpiry", expiryDate.toISOString());
      }
      setShowPasswordSetupModal(false);
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
      throw err;
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Client-side validation
    if (!loginData.password || loginData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }
    
    if (!loginData.loginId || !/^\d{10}$/.test(loginData.loginId)) {
      setError("Please enter a valid 10-digit phone number");
      setLoading(false);
      return;
    }
    
    // Additional phone validation - remove any non-digit characters and check length
    const cleanPhone = loginData.loginId.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError("Please enter exactly 10 digits for the phone number");
      setLoading(false);
      return;
    }
    
    console.log('Sending login request:', { 
      phone: loginData.loginId, 
      password: loginData.password,
      passwordLength: loginData.password.length 
    });
    
    // Trim the phone number to remove any whitespace
    const trimmedPhone = loginData.loginId.trim();
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: trimmedPhone, 
          password: loginData.password 
        })
      });
      
      const data = await res.json();
      console.log('Login response:', { status: res.status, data });
      
      if (!res.ok || !data.success) {
        if (data.requiresOtp) {
          // User exists but no password, switch to OTP login
          setLoginStep("otp");
          // Send OTP for this user
          await sendOtpForLogin(loginData.loginId);
        } else if (data.message && data.message.includes('Password not set')) {
          // User somehow got to password step without password, switch to OTP
          setLoginStep("otp");
          await sendOtpForLogin(loginData.loginId);
        } else {
          setError(data.message || "Invalid credentials");
        }
        setLoading(false);
        return;
      }
      
      localStorage.setItem("token", data.data.token);
      // Redirect to the original page or home
      window.location.href = redirectUrl;
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handleOtpLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const phone = loginData.loginId.trim();
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode: 'login' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to send OTP");
        setLoading(false);
        return;
      }
      setMode("otp-login");
      setStep("otp");
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handleOtpLoginVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginData.loginId, otp })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Invalid OTP");
        setLoading(false);
        return;
      }
      
      // Check if user needs password setup
      if (data.data.needsPasswordSetup) {
        setCurrentToken(data.data.token);
        setShowPasswordSetupModal(true);
        setLoading(false);
        return;
      }
      
      localStorage.setItem("token", data.data.token);
      if (rememberMe) {
        // Set token to expire in 30 days
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem("tokenExpiry", expiryDate.toISOString());
      }
      window.location.href = redirectUrl;
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const resetLoginFlow = () => {
    setLoginStep("phone");
    setLoginData({ loginId: "", password: "" });
    setError("");
    setSuccessMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#0F172A]">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <img
              src="/images/Logo.png"
              alt="Ahibi logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <CardTitle className="text-white">
            {mode === "login" && loginStep === "phone" && "Welcome Back"}
            {mode === "otp-login" && step === "details" && "Login with OTP"}
            {mode === "otp-login" && step === "otp" && "Verify OTP"}
            {mode === "signup" && step === "details" && "Create Your Account"}
          </CardTitle>
          <CardDescription className="text-white/80">
            {mode === "login" && loginStep === "phone" && "Enter your phone number to login instantly"}
            {mode === "otp-login" &&
              step === "details" &&
              "Enter your phone number to receive OTP"}
            {mode === "otp-login" &&
              step === "otp" &&
              `We've sent a 6-digit code to ${loginData.loginId}`}
            {mode === "signup" &&
              step === "details" &&
              "Fill in your details to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-md p-3 mb-4">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-green-400 text-sm bg-green-900/20 border border-green-700 rounded-md p-3 mb-4">
              {successMessage}
            </div>
          )}

          {/* Mode Toggle - Only show on initial step */}
          {(mode === "login" ||
            mode === "otp-login" ||
            (mode === "signup" && step === "details")) && (
              <div className="flex border rounded-lg p-1 mb-6">
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "login"
                    ? "bg-primary text-primary-foreground"
                    : "text-white"
                    }`}
                  onClick={() => {
                    setMode("login");
                    setStep("details");
                    resetLoginFlow();
                  }}
                >
                  Login
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "signup"
                    ? "bg-primary text-primary-foreground"
                    : "text-white"
                    }`}
                  onClick={() => {
                    setMode("signup");
                    setStep("details");
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}

          {mode === "login" && loginStep === "phone" && (
            <>
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginId" className="text-white">Phone Number</Label>
                  <Input
                    id="loginId"
                    type="text"
                    placeholder="Enter your phone number"
                    value={loginData.loginId}
                    onChange={(e) =>
                      setLoginData({ ...loginData, loginId: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </>
          )}

          {mode === "login" && loginStep === "password" && (
            <>
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm text-white">
                    Remember me for 30 days
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <div className="text-center space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetLoginFlow}
                    type="button"
                    className="text-white"
                  >
                    ← Use Different Number
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordResetModal(true)}
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            </>
          )}

          {mode === "login" && loginStep === "otp" && (
            <>
              <form onSubmit={handleOtpLoginVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginOtp" className="text-white">Enter OTP</Label>
                  <Input
                    id="loginOtp"
                    type="text"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
                <div className="text-center space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetLoginFlow}
                    type="button"
                    className="text-white"
                  >
                    ← Use Different Number
                  </Button>
                  <p className="text-xs ">
                    {sendingOtp ? "Sending OTP..." : "Didn't receive code?"}{" "}
                    {!sendingOtp && (
                      <button type="button" className="underline">
                        Resend OTP
                      </button>
                    )}
                  </p>
                </div>
              </form>
            </>
          )}

          {mode === "otp-login" && step === "otp" && (
            <form onSubmit={handleOtpLoginVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginOtp" className="text-white">Enter OTP</Label>
                <Input
                  id="loginOtp"
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Login with OTP
              </Button>
              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("details")}
                  type="button"
                  className="text-white"
                >
                  ← Change Number
                </Button>
                <p className="text-xs ">
                  Didn't receive code?{" "}
                  <button type="button" className="underline">
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}

          {mode === "signup" && step === "details" && (
            // Signup Details Form
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={signupData.name}
                  onChange={(e) =>
                    setSignupData({ ...signupData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData({ ...signupData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">Mobile Number *</Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                    <Phone className="h-4 w-4 mr-1" />
                    <span className="text-sm">+91</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter mobile number"
                    value={signupData.phone}
                    onChange={(e) =>
                      setSignupData({ ...signupData, phone: e.target.value })
                    }
                    className="rounded-l-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-white">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter your city"
                 
                  value={signupData.city}
                  onChange={(e) => setSignupData({ ...signupData, city: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={signupData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    setSignupData({
                      ...signupData,
                      agreeToTerms: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="terms" className="text-sm text-white">
                  I agree to the{" "}
                  <Link href="/terms" className="underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !signupData.agreeToTerms ||
                  !signupData.name ||
                  !signupData.email ||
                  !signupData.phone ||
                  !signupData.city
                }
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          )}

          {/* Security Badge - Only show on login and initial signup */}
          {(mode === "login" ||
            mode === "otp-login" ||
            (mode === "signup" && step === "details")) && (
              <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
                <Shield className="h-4 w-4 mr-1" />
                {mode === "login" ? "Instant phone login" : mode === "signup" ? "Secure account creation" : "Secured with OTP verification"}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Password Setup Modal */}
      <PasswordSetupModal
        isOpen={showPasswordSetupModal}
        onClose={() => setShowPasswordSetupModal(false)}
        onSubmit={handlePasswordSetup}
        loading={loading}
        isSignup={mode === "signup"}
      />

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        phone={loginData.loginId}
      />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#0F172A]">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <img
                src="/images/Logo.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-white">Loading...</CardTitle>
            <CardDescription className="text-white/80">
              Please wait while we load the authentication page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}

