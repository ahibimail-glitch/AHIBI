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
  const [step, setStep] = useState<"details" | "otp" | "role" | "complete">(
    "details"
  );
  const [loginData, setLoginData] = useState({
    loginId: "",
    password: "",
    rememberMe: false,
  });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    agreeToTerms: false,
  });
  const [otp, setOtp] = useState("");
  const [userRole, setUserRole] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For login mode, authenticate directly
    // In real app, validate credentials against database
    window.location.href = "/profile"; // or redirect based on user role
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Proceed to OTP verification after collecting user details
    setStep("otp");
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // After OTP verification, proceed to role selection
    setStep("role");
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole) {
      setStep("complete");
    }
  };

  const handleCompleteRegistration = () => {
    // Create user profile and redirect
    window.location.href = `/${userRole}`;
  };

  const handleOtpLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Send OTP to the provided phone/email
    setStep("otp");
  };

  const handleOtpLoginVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify OTP and login existing user
    window.location.href = "/dashboard"; // or redirect based on user role
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
            {mode === "signup" && step === "role" && "Select Your Role"}
            {mode === "signup" && step === "complete" && "Welcome to Ahibi!"}
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
            {mode === "signup" &&
              step === "role" &&
              "Choose how you want to use Ahibi"}
            {mode === "signup" &&
              step === "complete" &&
              "Your account has been created successfully"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mode Toggle - Only show on initial step */}
          {(mode === "login" ||
            mode === "otp-login" ||
            (mode === "signup" && step === "details")) && (
            <div className="flex border rounded-lg p-1 mb-6">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === "login"
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
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === "signup"
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
            // Login Form
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginId" className="text-white">Email or Phone Number</Label>
                <Input
                  id="loginId"
                  type="text"
                  placeholder="Enter email or phone number"
                  value={loginData.loginId}
                  onChange={(e) =>
                    setLoginData({ ...loginData, loginId: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={loginData.rememberMe}
                    onCheckedChange={(checked) =>
                      setLoginData({
                        ...loginData,
                        rememberMe: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="remember" className="text-white">Remember me</Label>
                </div>
                <button type="button" className="text-primary hover:underline">
                  Forgot Password?
                </button>
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    setMode("otp-login");
                    setStep("details");
                  }}
                >
                  Login with OTP instead
                </button>
              </div>
            </form>
          )}

          {mode === "otp-login" && step === "details" && (
            // OTP Login Form
            <form onSubmit={handleOtpLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otpLoginId" className="text-white">Email or Phone Number</Label>
                <Input
                  id="otpLoginId"
                  type="text"
                  placeholder="Enter email or phone number"
                  value={loginData.loginId}
                  onChange={(e) =>
                    setLoginData({ ...loginData, loginId: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send OTP
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    setMode("login");
                    setStep("details");
                  }}
                >
                  ← Back to Password Login
                </button>
              </div>
            </form>
          )}

          {mode === "otp-login" && step === "otp" && (
            <form onSubmit={handleOtpLoginVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginOtp"className="text-white">Enter OTP</Label>
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
                <Select
                  value={signupData.city}
                  onValueChange={(value) =>
                    setSignupData({ ...signupData, city: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mumbai">Mumbai</SelectItem>
                    <SelectItem value="delhi">Delhi</SelectItem>
                    <SelectItem value="bangalore">Bangalore</SelectItem>
                    <SelectItem value="pune">Pune</SelectItem>
                    <SelectItem value="chennai">Chennai</SelectItem>
                    <SelectItem value="hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="kolkata">Kolkata</SelectItem>
                    <SelectItem value="ahmedabad">Ahmedabad</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="terms" className="text-sm"className="text-white">
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
                <Label htmlFor="otp"className="text-white">Enter OTP</Label>
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

          {mode === "signup" && step === "role" && (
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label className="text-white">I want to join as</Label>
                <div className="grid grid-cols-1 gap-3 text-white">
                  {[
                    {
                      value: "user",
                      label: "Event Attendee",
                      icon: User,
                      desc: "Discover and book events",
                    },
                    {
                      value: "organizer",
                      label: "Event Organizer",
                      icon: Calendar,
                      desc: "Create and manage events",
                    },
                    {
                      value: "artist",
                      label: "Artist/Performer",
                      icon: Music,
                      desc: "Showcase talent and get bookings",
                    },
                    {
                      value: "venue",
                      label: "Venue Owner",
                      icon: Building,
                      desc: "List venue and manage bookings",
                    },
                  ].map((role) => (
                    <div
                      key={role.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        userRole === role.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setUserRole(role.value)}
                    >
                      <div className="flex items-center space-x-3">
                        <role.icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{role.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {role.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!userRole}>
                Complete Registration
              </Button>
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("otp")}
                  type="button"
                >
                  ← Back to Verification
                </Button>
              </div>
            </form>
          )}

          {mode === "signup" && step === "complete" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-white/70">
                  Account Created Successfully!
                </h3>
                <p className="text-muted-foreground">
                  Welcome to Ahibi, {signupData.name}! Your account has been
                  created and verified.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg text-left">
                <h4 className="font-medium mb-2">Account Details:</h4>
                <div className="space-y-1 text-sm ">
                  <p>
                    <strong>Name:</strong> {signupData.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {signupData.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> +91 {signupData.phone}
                  </p>
                  <p>
                    <strong>City:</strong> {signupData.city}
                  </p>
                  <p>
                    <strong>Role:</strong>{" "}
                    {userRole === "user"
                      ? "Event Attendee"
                      : userRole === "organizer"
                      ? "Event Organizer"
                      : userRole === "artist"
                      ? "Artist/Performer"
                      : "Venue Owner"}
                  </p>
                </div>
              </div>

              <Button onClick={handleCompleteRegistration} className="w-full">
                Get Started with Ahibi
              </Button>
            </div>
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
