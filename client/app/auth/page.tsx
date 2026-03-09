"use client";

import type React from "react";

import { useState, Suspense } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { PasswordSetupModal } from "@/components/ui/password-setup-modal";
import { PasswordResetModal } from "@/components/ui/password-reset-modal";
import { getSafeRedirectUrl } from "@/utils/redirectUtils";
import { useToast } from "@/components/ui/use-toast";

type SignupField = "name" | "email" | "phone" | "city" | "agreeToTerms";

type SignupErrors = {
  name: string;
  email: string;
  phone: string;
  city: string;
  agreeToTerms: string;
};

function AuthPageContent() {
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'));
  const { toast } = useToast();
  
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
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({
    name: "",
    email: "",
    phone: "",
    city: "",
    agreeToTerms: "",
  });

  const validateSignupField = (field: SignupField, value?: string | boolean) => {
    switch (field) {
      case "name": {
        const name = typeof value === "string" ? value.trim() : signupData.name.trim();
        if (!name) return "Full name is required";
        if (name.length < 3) return "Full name must be at least 3 characters long";
        if (!/^[A-Za-z]+(?:[\s'.-][A-Za-z]+)*$/.test(name)) return "Enter a valid full name";
        return "";
      }
      case "email": {
        const email = typeof value === "string" ? value.trim() : signupData.email.trim();
        if (!email) return "Email address is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
        return "";
      }
      case "phone": {
        const phone = typeof value === "string" ? value.replace(/\D/g, "") : signupData.phone.replace(/\D/g, "");
        if (!phone) return "Mobile number is required";
        if (phone.length !== 10) return "Mobile number must be exactly 10 digits";
        if (!/^[6-9]\d{9}$/.test(phone)) return "Enter a valid Indian mobile number";
        return "";
      }
      case "city": {
        const city = typeof value === "string" ? value.trim() : signupData.city.trim();
        if (!city) return "City is required";
        if (city.length < 2) return "City must be at least 2 characters long";
        if (!/^[A-Za-z]+(?:[\s.-][A-Za-z]+)*$/.test(city)) return "Enter a valid city name";
        return "";
      }
      case "agreeToTerms": {
        const agreed = typeof value === "boolean" ? value : signupData.agreeToTerms;
        if (!agreed) return "You must agree to the Terms of Service and Privacy Policy";
        return "";
      }
      default:
        return "";
    }
  };

  const showFieldToast = (field: SignupField, message: string) => {
    toast({
      title: `Invalid ${field === "agreeToTerms" ? "consent" : field}`,
      description: message,
      variant: "destructive",
    });
  };

  const handleSignupFieldChange = (field: SignupField, value: string | boolean) => {
    if (field === "agreeToTerms") {
      const checked = value as boolean;
      setSignupData((prev) => ({ ...prev, agreeToTerms: checked }));
      setSignupErrors((prev) => ({
        ...prev,
        agreeToTerms: validateSignupField("agreeToTerms", checked),
      }));
      return;
    }

    const nextValue = value as string;
    setSignupData((prev) => ({ ...prev, [field]: nextValue }));
    setSignupErrors((prev) => ({
      ...prev,
      [field]: validateSignupField(field, nextValue),
    }));
  };

  const handleSignupFieldBlur = (field: SignupField) => {
    const value = field === "agreeToTerms" ? signupData.agreeToTerms : signupData[field];
    const message = validateSignupField(field, value);
    setSignupErrors((prev) => ({ ...prev, [field]: message }));
    if (message) {
      showFieldToast(field, message);
    }
  };

  const validateSignupForm = () => {
    const nextErrors: SignupErrors = {
      name: validateSignupField("name"),
      email: validateSignupField("email"),
      phone: validateSignupField("phone"),
      city: validateSignupField("city"),
      agreeToTerms: validateSignupField("agreeToTerms"),
    };

    setSignupErrors(nextErrors);

    const firstErrorEntry = (Object.entries(nextErrors) as [SignupField, string][]).find(([, message]) => !!message);
    if (firstErrorEntry) {
      const [field, message] = firstErrorEntry;
      showFieldToast(field, message);
      return false;
    }

    return true;
  };

  const persistTokenAndRedirect = (token: string) => {
    localStorage.setItem("token", token);
    if (rememberMe) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      localStorage.setItem("tokenExpiry", expiryDate.toISOString());
    }
    window.location.href = redirectUrl;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: signupData.phone.trim(),
          mode: 'signup'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to send OTP");
        toast({
          title: "Signup failed",
          description: data.message || "Failed to send OTP",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      setStep("otp");
      setOtp("");
      setSuccessMessage("OTP sent successfully! Check your phone.");
    } catch (err) {
      setError("Network error. Please try again.");
      toast({
        title: "Network error",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    const trimmedPhone = loginData.loginId.trim();
    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError("Please enter a valid 10-digit phone number");
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      if (data.data.hasPassword) {
        setLoginStep("password");
        setSuccessMessage("");
      } else {
        const otpSent = await sendOtpForLogin(trimmedPhone);
        if (otpSent) {
          setLoginStep("otp");
        }
      }
      setLoading(false);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const sendOtpForLogin = async (phone: string) => {
    setSendingOtp(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode: 'login' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to send OTP");
        return false;
      }
      setError("");
      setSuccessMessage("OTP sent successfully! Check your phone.");
      return true;
    } catch (err) {
      setError("Failed to send OTP");
      return false;
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

      setShowPasswordSetupModal(false);
      persistTokenAndRedirect(currentToken);
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
      
      if (!res.ok || !data.success) {
        if (data.requiresOtp) {
          const otpSent = await sendOtpForLogin(trimmedPhone);
          if (otpSent) {
            setLoginStep("otp");
          }
        } else if (data.message && data.message.includes('Password not set')) {
          const otpSent = await sendOtpForLogin(trimmedPhone);
          if (otpSent) {
            setLoginStep("otp");
          }
        } else {
          setError(data.message || "Invalid credentials");
        }
        setLoading(false);
        return;
      }

      persistTokenAndRedirect(data.data.token);
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handleOtpLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
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
      setSuccessMessage("OTP sent successfully! Check your phone.");
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
      const payload = mode === "signup"
        ? {
            phone: signupData.phone.trim(),
            otp,
            name: signupData.name.trim(),
            email: signupData.email.trim(),
            city: signupData.city.trim()
          }
        : {
            phone: loginData.loginId.trim(),
            otp
          };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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

      persistTokenAndRedirect(data.data.token);
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handleSignupResendOtp = async () => {
    setError("");
    setSuccessMessage("");

    const phone = signupData.phone.trim();
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode: 'signup' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to resend OTP");
        return;
      }
      setSuccessMessage("OTP resent successfully! Check your phone.");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLoginResendOtp = async () => {
    const phone = loginData.loginId.trim();
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    await sendOtpForLogin(phone);
  };

  const resetLoginFlow = () => {
    setLoginStep("phone");
    setLoginData({ loginId: "", password: "" });
    setOtp("");
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
            {mode === "login" && loginStep === "password" && "Enter Your Password"}
            {mode === "login" && loginStep === "otp" && "Verify OTP"}
            {mode === "otp-login" && step === "details" && "Login with OTP"}
            {mode === "otp-login" && step === "otp" && "Verify OTP"}
            {mode === "signup" && step === "details" && "Create Your Account"}
            {mode === "signup" && step === "otp" && "Verify Your Number"}
          </CardTitle>
          <CardDescription className="text-white/80">
            {mode === "login" && loginStep === "phone" && "Enter your phone number to continue"}
            {mode === "login" && loginStep === "password" && `Enter the password for ${loginData.loginId}`}
            {mode === "login" && loginStep === "otp" && `We've sent a 6-digit code to ${loginData.loginId}`}
            {mode === "otp-login" &&
              step === "details" &&
              "Enter your phone number to receive OTP"}
            {mode === "otp-login" &&
              step === "otp" &&
              `We've sent a 6-digit code to ${loginData.loginId}`}
            {mode === "signup" &&
              step === "details" &&
              "Fill in your details to get started"}
            {mode === "signup" &&
              step === "otp" &&
              `We've sent a 6-digit code to ${signupData.phone}`}
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
                  {loading ? "Checking..." : "Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode("otp-login");
                    setStep("details");
                    setError("");
                    setSuccessMessage("");
                  }}
                >
                  Login with OTP Instead
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
                      <button type="button" className="underline" onClick={handleLoginResendOtp}>
                        Resend OTP
                      </button>
                    )}
                  </p>
                </div>
              </form>
            </>
          )}

          {mode === "otp-login" && step === "details" && (
            <form onSubmit={handleOtpLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otpLoginPhone" className="text-white">Phone Number</Label>
                <Input
                  id="otpLoginPhone"
                  type="text"
                  placeholder="Enter your phone number"
                  value={loginData.loginId}
                  onChange={(e) =>
                    setLoginData({ ...loginData, loginId: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="otp-login-remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="otp-login-remember" className="text-sm text-white">
                  Remember me for 30 days
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-white"
                onClick={() => {
                  setMode("login");
                  setStep("details");
                  resetLoginFlow();
                }}
              >
                ← Back to Login
              </Button>
            </form>
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
                  <button type="button" className="underline" onClick={handleLoginResendOtp}>
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}

          {mode === "signup" && step === "otp" && (
            <form onSubmit={handleOtpLoginVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signupOtp" className="text-white">Enter OTP</Label>
                <Input
                  id="signupOtp"
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="signup-remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="signup-remember" className="text-sm text-white">
                  Remember me for 30 days
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </Button>
              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("details")}
                  type="button"
                  className="text-white"
                >
                  ← Edit Details
                </Button>
                <p className="text-xs ">
                  {sendingOtp ? "Sending OTP..." : "Didn't receive code?"}{" "}
                  {!sendingOtp && (
                    <button type="button" className="underline" onClick={handleSignupResendOtp}>
                      Resend OTP
                    </button>
                  )}
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
                    handleSignupFieldChange("name", e.target.value)
                  }
                  onBlur={() => handleSignupFieldBlur("name")}
                  className={signupErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
                {signupErrors.name && (
                  <p className="text-xs text-red-400">{signupErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={signupData.email}
                  onChange={(e) =>
                    handleSignupFieldChange("email", e.target.value)
                  }
                  onBlur={() => handleSignupFieldBlur("email")}
                  className={signupErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
                {signupErrors.email && (
                  <p className="text-xs text-red-400">{signupErrors.email}</p>
                )}
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
                      handleSignupFieldChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    onBlur={() => handleSignupFieldBlur("phone")}
                    className={`rounded-l-none ${signupErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>
                {signupErrors.phone && (
                  <p className="text-xs text-red-400">{signupErrors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-white">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter your city"
                  value={signupData.city}
                  onChange={(e) => handleSignupFieldChange("city", e.target.value)}
                  onBlur={() => handleSignupFieldBlur("city")}
                  className={signupErrors.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
                {signupErrors.city && (
                  <p className="text-xs text-red-400">{signupErrors.city}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={signupData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    handleSignupFieldChange("agreeToTerms", checked as boolean)
                  }
                  onBlur={() => handleSignupFieldBlur("agreeToTerms")}
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
              {signupErrors.agreeToTerms && (
                <p className="text-xs text-red-400">{signupErrors.agreeToTerms}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !signupData.agreeToTerms ||
                  !signupData.name.trim() ||
                  !signupData.email.trim() ||
                  !signupData.phone.trim() ||
                  !signupData.city.trim() ||
                  Object.values(signupErrors).some(Boolean)
                }
              >
                {loading ? "Sending OTP..." : "Continue with OTP"}
              </Button>
            </form>
          )}

          {/* Security Badge - Only show on login and initial signup */}
          {(mode === "login" ||
            mode === "otp-login" ||
            (mode === "signup" && step === "details")) && (
              <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
                <Shield className="h-4 w-4 mr-1" />
                {mode === "login" ? "Password or OTP-secured login" : mode === "signup" ? "Secure account creation with OTP" : "Secured with OTP verification"}
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

