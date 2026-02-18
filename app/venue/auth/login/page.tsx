"use client"

import type React from "react"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getSafeRedirectUrl } from "@/utils/redirectUtils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Ticket, Building, Mail, Shield, Phone } from "lucide-react"
import Link from "next/link"
import { useVenueAuth } from "@/hooks/useVenueAuth"

function VenueLoginContent() {
  const searchParams = useSearchParams()
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'), '/venue/dashboard')
  const [step, setStep] = useState<
    "login" | "otp-verify" | "pending" | "rejected" | "forgot-send" | "forgot-verify" | "forgot-reset"
  >("login")
  const [authMethod, setAuthMethod] = useState<"otp" | "password">("otp")
  const [loginData, setLoginData] = useState({
    phone: "",
    otp: "",
    password: "",
    forgotOtp: "",
    newPassword: "",
    confirmPassword: "",
    rememberMe: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useVenueAuth()

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          mode: 'login'
        }),
      });

      if (response.ok) {
        setStep("otp-verify")
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('OTP request error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/auth/login-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          password: loginData.password,
        }),
      })

      const data = await response.json()

      if (response.status === 202) {
        setStep("pending")
      } else if (response.status === 403) {
        setStep("rejected")
      } else if (response.ok) {
        login(data.data.token, data.data.user)
        window.location.href = redirectUrl
      } else {
        setError(data.message || 'Invalid phone or password')
      }
    } catch (error) {
      console.error('Password login error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setStep('forgot-verify')
      } else {
        setError(data.message || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('Forgot password send OTP error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          otp: loginData.forgotOtp,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setStep('forgot-reset')
      } else {
        setError(data.message || 'Invalid OTP')
      }
    } catch (error) {
      console.error('Forgot password verify OTP error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/auth/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          newPassword: loginData.newPassword,
          confirmPassword: loginData.confirmPassword,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setLoginData({
          ...loginData,
          forgotOtp: "",
          newPassword: "",
          confirmPassword: "",
          password: "",
        })
        setAuthMethod('password')
        setStep('login')
      } else {
        setError(data.message || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Forgot password reset error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          otp: loginData.otp,
          mode: 'login'
        }),
      });

      const data = await response.json();

      if (response.status === 202) {
        setStep("pending")
      } else if (response.status === 403) {
        setStep("rejected")
      } else if (response.ok) {
        login(data.data.token, data.data.user)
        window.location.href = redirectUrl
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-white-900 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900/95 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-4">
           <div className="flex items-center justify-center space-x-2">
            <img
              src="/images/Logo.png"
              alt="Ahibi logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          </div>
          <CardTitle className="text-white text-xl">
            {step === "login" && "Venue Owner Login"}
            {step === "otp-verify" && "Verify OTP"}
            {step === "forgot-send" && "Reset Password"}
            {step === "forgot-verify" && "Verify OTP"}
            {step === "forgot-reset" && "Set New Password"}
            {step === "pending" && "Account Pending"}
            {step === "rejected" && "Account Rejected"}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {step === "login" && "Access your venue management dashboard"}
            {step === "otp-verify" && `We've sent a 6-digit code to ${loginData.phone}`}
            {step === "forgot-send" && "Enter your registered phone number to receive an OTP"}
            {step === "forgot-verify" && `We've sent a 6-digit code to ${loginData.phone}`}
            {step === "forgot-reset" && "Choose a new password for your account"}
            {step === "pending" && "Your account is pending admin approval"}
            {step === "rejected" && "Your account has been rejected"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "login" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={authMethod === 'otp' ? 'default' : 'outline'}
                  className={
                    authMethod === 'otp'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity'
                      : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                  }
                  onClick={() => {
                    setAuthMethod('otp')
                    setError('')
                  }}
                >
                  OTP
                </Button>
                <Button
                  type="button"
                  variant={authMethod === 'password' ? 'default' : 'outline'}
                  className={
                    authMethod === 'password'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity'
                      : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                  }
                  onClick={() => {
                    setAuthMethod('password')
                    setError('')
                  }}
                >
                  Password
                </Button>
              </div>

              {authMethod === 'otp' && (
                <form onSubmit={handleOtpRequest} className="space-y-4">
               {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-200">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={loginData.phone}
                    onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={loginData.rememberMe}
                  onCheckedChange={(checked) => setLoginData({ ...loginData, rememberMe: checked as boolean })}
                  className="border-gray-600 data-[state=checked]:bg-orange-600"
                />
                <Label htmlFor="remember" className="text-gray-300">
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
                </form>
              )}

              {authMethod === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-200">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={loginData.phone}
                        onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-200">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={loginData.rememberMe}
                        onCheckedChange={(checked) => setLoginData({ ...loginData, rememberMe: checked as boolean })}
                        className="border-gray-600 data-[state=checked]:bg-orange-600"
                      />
                      <Label htmlFor="remember" className="text-gray-300">
                        Remember me
                      </Label>
                    </div>

                    <button
                      type="button"
                      className="text-sm text-orange-400 hover:underline"
                      onClick={() => {
                        setStep('forgot-send')
                        setError('')
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {step === "otp-verify" && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}
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
                  className="text-center text-lg tracking-widest bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
              >
                {loading ? "Verifying..." : "Verify & Login"}
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
                  <button
                    type="button"
                    className="underline text-orange-400"
                    onClick={() => {
                      setError("")
                      const fakeEvent = { preventDefault: () => {} } as unknown as React.FormEvent
                      handleOtpRequest(fakeEvent)
                    }}
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}

          {step === 'forgot-send' && (
            <form onSubmit={handleForgotSendOtp} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="forgot-phone" className="text-gray-200">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="forgot-phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={loginData.phone}
                    onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('login')
                    setError('')
                  }}
                  type="button"
                  className="text-gray-300 hover:text-white"
                >
                  ← Back to Login
                </Button>
              </div>
            </form>
          )}

          {step === 'forgot-verify' && (
            <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="forgot-otp" className="text-gray-200">
                  Enter OTP
                </Label>
                <Input
                  id="forgot-otp"
                  type="text"
                  placeholder="6-digit code"
                  value={loginData.forgotOtp}
                  onChange={(e) => setLoginData({ ...loginData, forgotOtp: e.target.value })}
                  maxLength={6}
                  className="text-center text-lg tracking-widest bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('forgot-send')
                    setError('')
                  }}
                  type="button"
                  className="text-gray-300 hover:text-white"
                >
                  ← Back
                </Button>
              </div>
            </form>
          )}

          {step === 'forgot-reset' && (
            <form onSubmit={handleForgotResetPassword} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-200">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={loginData.newPassword}
                  onChange={(e) => setLoginData({ ...loginData, newPassword: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-gray-200">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={loginData.confirmPassword}
                  onChange={(e) => setLoginData({ ...loginData, confirmPassword: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-800 hover:opacity-90 transition-opacity"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('login')
                    setError('')
                    setAuthMethod('password')
                  }}
                  type="button"
                  className="text-gray-300 hover:text-white"
                >
                  ← Back to Login
                </Button>
              </div>
            </form>
          )}

          {step === "pending" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-yellow-500/20 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Account Pending Approval</h3>
                <p className="text-gray-300">
                  Your venue account is currently under review by our admin team. 
                  You will be notified once your account is approved.
                </p>
              </div>

              <Button
                onClick={() => setStep("login")}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Back to Login
              </Button>
            </div>
          )}

          {step === "rejected" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Account Rejected</h3>
                <p className="text-gray-300">
                  Your venue account has been rejected. Please contact support for more information.
                </p>
              </div>

              <Button
                onClick={() => setStep("login")}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Back to Login
              </Button>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link href="/venue/auth/signup" className="text-orange-400 hover:underline">
                Sign Up
              </Link>
            </p>
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              ← Back to Home
            </Link>
          </div>

          <div className="flex items-center justify-center text-sm text-gray-400 pt-4 border-t border-gray-700">
            <Shield className="h-4 w-4 mr-1" />
            Secured with authentication
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VenueLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <VenueLoginContent />
    </Suspense>
  )
}
