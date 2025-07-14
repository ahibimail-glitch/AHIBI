"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Ticket, Music, Mail, Shield } from "lucide-react"
import Link from "next/link"

export default function ArtistLoginPage() {
  const [step, setStep] = useState<"login" | "otp-verify">("login")
  const [loginData, setLoginData] = useState({
    loginId: "",
    otp: "",
    rememberMe: false,
  })

  const handleOtpRequest = (e: React.FormEvent) => {
    e.preventDefault()
    setStep("otp-verify")
  }

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = "/artist/dashboard"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400  to-green flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900/95 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            {/* <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center">
              <Music className="h-6 w-6 text-white" />
            </div> */}
           <div className="flex items-center justify-center space-x-2">
            <img
              src="/images/Logo.png"
              alt="Ahibi logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          </div>
          <CardTitle className="text-white text-xl">{step === "login" ? "Artist Login" : "Verify OTP"}</CardTitle>
          <CardDescription className="text-gray-300">
            {step === "login" ? "Access your artist dashboard" : `We've sent a 6-digit code to ${loginData.loginId}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "login" && (
            <form onSubmit={handleOtpRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginId" className="text-gray-200">
                  Email or Phone Number
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="loginId"
                    type="text"
                    placeholder="Enter email or phone"
                    value={loginData.loginId}
                    onChange={(e) => setLoginData({ ...loginData, loginId: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={loginData.rememberMe}
                  onCheckedChange={(checked) => setLoginData({ ...loginData, rememberMe: checked as boolean })}
                  className="border-gray-600 data-[state=checked]:bg-green-600"
                />
                <Label htmlFor="remember" className="text-gray-300">
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-90 transition-opacity"
              >
                Send OTP
              </Button>
            </form>
          )}

          {step === "otp-verify" && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-gray-200">
                  Enter OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="6-digit code"
                  value={loginData.otp}
                  onChange={(e) => setLoginData({ ...loginData, otp: e.target.value })}
                  maxLength={6}
                  className="text-center text-lg tracking-widest bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-90 transition-opacity"
              >
                Verify & Login
              </Button>
              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("login")}
                  type="button"
                  className="text-gray-300 hover:text-white"
                >
                  ← Back to Login
                </Button>
                <p className="text-xs text-gray-400">
                  Didn't receive code?{" "}
                  <button type="button" className="underline text-green-400">
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}

          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link href="/artist/auth/signup" className="text-green-400 hover:underline">
                Sign Up
              </Link>
            </p>
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
  )
}
