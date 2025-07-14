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
import { Ticket, Building, User, Mail, Phone, Shield } from "lucide-react";
import Link from "next/link";

export default function VenueSignupPage() {
  const [step, setStep] = useState<"details" | "otp" | "complete">("details");
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    venueName: "",
    venueType: "",
    capacity: "",
    agreeToTerms: false,
  });
  const [otp, setOtp] = useState("");

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("otp");
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("complete");
  };

  const handleComplete = () => {
    window.location.href = "/venue";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-white-900 to-white flex items-center justify-center p-4">
      {" "}
      <Card className="w-full max-w-md bg-gray-900/95 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            {/* <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full flex items-center justify-center">
              <Building className="h-6 w-6 text-white" />
            </div> */}
            <div className="flex items-center justify-center space-x-2">
              <img
                src="/images/Logo.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-white text-xl">
            {step === "details" && "Create Venue Account"}
            {step === "otp" && "Verify Your Phone"}
            {step === "complete" && "Welcome to Ahibi!"}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {step === "details" && "List your venue and start hosting events"}
            {step === "otp" &&
              `We've sent a 6-digit code to ${signupData.phone}`}
            {step === "complete" && "Your venue listing is ready"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "details" && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-200">
                  Your Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={signupData.name}
                    onChange={(e) =>
                      setSignupData({ ...signupData, name: e.target.value })
                    }
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={(e) =>
                      setSignupData({ ...signupData, email: e.target.value })
                    }
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-200">
                  Mobile Number *
                </Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-gray-800 border-gray-600">
                    <Phone className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="text-sm text-gray-300">+91</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter mobile number"
                    value={signupData.phone}
                    onChange={(e) =>
                      setSignupData({ ...signupData, phone: e.target.value })
                    }
                    className="rounded-l-none bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-200">
                  City *
                </Label>
                <Select
                  value={signupData.city}
                  onValueChange={(value) =>
                    setSignupData({ ...signupData, city: value })
                  }
                  required
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="mumbai">Mumbai</SelectItem>
                    <SelectItem value="delhi">Delhi</SelectItem>
                    <SelectItem value="bangalore">Bangalore</SelectItem>
                    <SelectItem value="pune">Pune</SelectItem>
                    <SelectItem value="chennai">Chennai</SelectItem>
                    <SelectItem value="hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="kolkata">Kolkata</SelectItem>
                    <SelectItem value="ahmedabad">Ahmedabad</SelectItem>
                    <SelectItem value="dimapur">Dimapur</SelectItem>
                    <SelectItem value="kohima">Kohima</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venueName" className="text-gray-200">
                  Venue Name *
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="venueName"
                    placeholder="Enter venue name"
                    value={signupData.venueName}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        venueName: e.target.value,
                      })
                    }
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venueType" className="text-gray-200">
                  Venue Type *
                </Label>
                <Select
                  value={signupData.venueType}
                  onValueChange={(value) =>
                    setSignupData({ ...signupData, venueType: value })
                  }
                  required
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select venue type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="banquet-hall">Banquet Hall</SelectItem>
                    <SelectItem value="conference-center">
                      Conference Center
                    </SelectItem>
                    <SelectItem value="outdoor-venue">Outdoor Venue</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="auditorium">Auditorium</SelectItem>
                    <SelectItem value="club">Club/Lounge</SelectItem>
                    <SelectItem value="community-hall">
                      Community Hall
                    </SelectItem>
                    <SelectItem value="resort">Resort</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-gray-200">
                  Maximum Capacity *
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="Enter maximum capacity"
                  value={signupData.capacity}
                  onChange={(e) =>
                    setSignupData({ ...signupData, capacity: e.target.value })
                  }
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
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
                  className="border-gray-600 data-[state=checked]:bg-orange-600"
                />
                <Label htmlFor="terms" className="text-sm text-gray-300">
                  I agree to the{" "}
                  <Link href="/terms" className="underline text-orange-400">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline text-orange-400">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
                disabled={
                  !signupData.agreeToTerms ||
                  !signupData.name ||
                  !signupData.email ||
                  !signupData.phone ||
                  !signupData.city ||
                  !signupData.venueName ||
                  !signupData.venueType ||
                  !signupData.capacity
                }
              >
                Continue to Verification
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-gray-200">
                  Enter OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
              >
                Verify Phone Number
              </Button>
              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("details")}
                  type="button"
                  className="text-gray-300 hover:text-white"
                >
                  ← Back to Details
                </Button>
                <p className="text-xs text-gray-400">
                  Didn't receive code?{" "}
                  <button type="button" className="underline text-orange-400">
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}

          {step === "complete" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Account Created Successfully!
                </h3>
                <p className="text-gray-300">
                  Welcome to Ahibi 3.0, {signupData.name}! Your venue listing is
                  ready.
                </p>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg text-left border border-gray-600">
                <h4 className="font-medium mb-2 text-white">
                  Account Details:
                </h4>
                <div className="space-y-1 text-sm text-gray-300">
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
                    <strong>Venue:</strong> {signupData.venueName}
                  </p>
                  <p>
                    <strong>Type:</strong> {signupData.venueType}
                  </p>
                  <p>
                    <strong>Capacity:</strong> {signupData.capacity} guests
                  </p>
                </div>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
              >
                Start Managing Your Venue
              </Button>
            </div>
          )}

          <div className="text-center space-y-2">
            {step === "details" && (
              <p className="text-gray-400 text-sm">
                Already have an account?{" "}
                <Link
                  href="/venue/auth/login"
                  className="text-orange-400 hover:underline"
                >
                  Sign In
                </Link>
              </p>
            )}
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              ← Back to Home
            </Link>
          </div>

          <div className="flex items-center justify-center text-sm text-gray-400 pt-4 border-t border-gray-700">
            <Shield className="h-4 w-4 mr-1" />
            Secured with OTP verification
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
