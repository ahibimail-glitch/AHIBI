"use client";

import type React from "react";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "otp-login">("login");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [loginData, setLoginData] = useState({
    loginId: ""
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



  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: signupData.phone })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.message === 'Number is already registered') {
          setError('This mobile number is already registered. Please log in or use a different number.');
        } else {
          setError(data.message || "Failed to send OTP");
        }
        setLoading(false);
        return;
      }
      setStep("otp");
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Send name and city for signup, only phone+otp for login
      const payload = mode === 'signup'
        ? { phone: signupData.phone, otp, name: signupData.name, city: signupData.city, email: signupData.email }
        : { phone: loginData.loginId, otp };
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
      localStorage.setItem("token", data.data.token);
      window.location.href = "/";
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
      localStorage.setItem("token", data.data.token);
      window.location.href = "/";
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
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
            {mode === "login" && "Welcome Back"}
            {mode === "otp-login" && step === "details" && "Login with OTP"}
            {mode === "otp-login" && step === "otp" && "Verify OTP"}
            {mode === "signup" && step === "details" && "Create Your Account"}
            {mode === "signup" && step === "otp" && "Verify Your Phone"}
          </CardTitle>
          <CardDescription className="text-white/80">
            {mode === "login" && "Enter your credentials to continue"}
            {mode === "otp-login" &&
              step === "details" &&
              "Enter your email or phone to receive OTP"}
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

          {mode === "login" && (
  <>
    <form onSubmit={handleOtpLoginSubmit} className="space-y-4">
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
        {loading ? "Sending OTP..." : "Send OTP"}
      </Button>
    </form>
    {/* <p className="text-center mt-2">
      <button
        type="button"
        className="underline text-blue-400"
        onClick={() => {
          setMode("otp-login");
          setStep("details");
        }}
      >
        Login with OTP
      </button>
    </p> */}
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
                  className="bg-gray-800 border-gray-600 text-white"
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
                Continue to Verification
              </Button>
            </form>
          )}

          {mode === "signup" && step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-white">Enter OTP</Label>
                <Input
                  id="otp"
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
                Verify Phone Number
              </Button>
              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("details")}
                  type="button"
                  className="text-white"
                >
                  ← Back to Details
                </Button>
                <p className="text-xs text-muted-foreground">
                  Didn't receive code?{" "}
                  <button type="button" className="underline">
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}



          {/* Security Badge - Only show on login and initial signup */}
          {(mode === "login" ||
            mode === "otp-login" ||
            (mode === "signup" && step === "details")) && (
              <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
                <Shield className="h-4 w-4 mr-1" />
                Secured with OTP verification
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

