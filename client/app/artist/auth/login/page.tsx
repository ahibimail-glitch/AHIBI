"use client"

import type React from "react"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSafeRedirectUrl } from "@/utils/redirectUtils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Mail, Shield, AlertCircle, Loader2, Eye, EyeOff, Phone } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type LoginStep = "login" | "otp-verify" | "set-password" | "pending" | "rejected"

function ArtistLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'), '/artist/dashboard')
  const [step, setStep] = useState<LoginStep>("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loginData, setLoginData] = useState({
    phone: "",
    otp: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    rememberMe: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [tempToken, setTempToken] = useState("")

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!/^\d{10}$/.test(loginData.phone.trim())) {
      setError("Please enter a valid 10-digit phone number")
      return
    }
    if (!loginData.password || loginData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/artist/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginData.phone.trim(), password: loginData.password }),
      })

      const data = await response.json()

      if (response.status === 202) {
        setStep("pending")
      } else if (response.status === 403) {
        setStep("rejected")
      } else if (data.success) {
        localStorage.setItem('artist_token', data.data.token)
        localStorage.setItem('artist_user', JSON.stringify(data.data.user))
        router.push(redirectUrl)
      } else if (data.requiresOtp) {
        setError("No password set. Use \"Forgot password?\" below to set one via OTP.")
      } else {
        setError(data.message || 'Failed to login')
      }
    } catch (error) {
      console.error('Password login error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/artist/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          mode: 'login' // Specify that this is for login
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP')
      }

      setStep("otp-verify")
    } catch (error) {
      console.error('Error sending OTP:', error)
      setError(error instanceof Error ? error.message : 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/artist/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          otp: loginData.otp,
          mode: 'login'
        }),
      })

      const data = await response.json()

      if (response.status === 202) {
        setStep("pending")
        setLoading(false)
        return
      }

      if (response.status === 403) {
        setStep("rejected")
        setLoading(false)
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to verify OTP')
      }

      // Check if password needs to be set or if this is a password reset
      if (!data.data.hasPassword || isPasswordReset) {
        setTempToken(data.data.token)
        setStep("set-password")
        setLoading(false)
        return
      }

      // Save token and user data to localStorage
      localStorage.setItem('artist_token', data.data.token)
      localStorage.setItem('artist_user', JSON.stringify(data.data.user))

      // Redirect to original page or dashboard
      router.push(redirectUrl)
    } catch (error) {
      console.error('Error verifying OTP:', error)
      setError(error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (loginData.newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (loginData.newPassword !== loginData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/artist/auth/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ password: loginData.newPassword }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('artist_token', tempToken)
        router.push(redirectUrl)
      } else {
        setError(data.message || 'Failed to set password')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/artist/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
          mode: 'login'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP')
      }

      // Show success message (could be implemented with a toast notification)
      alert('OTP has been resent successfully')
    } catch (error) {
      console.error('Error resending OTP:', error)
      setError(error instanceof Error ? error.message : 'Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400  to-green flex items-center justify-center p-4">
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
            {step === "login" && "Artist Login"}
            {step === "otp-verify" && (isPasswordReset ? "Reset Password" : "Verify OTP")}
            {step === "set-password" && (isPasswordReset ? "Set New Password" : "Set Your Password")}
            {step === "pending" && "Account Pending"}
            {step === "rejected" && "Account Rejected"}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {step === "login" && "Access your artist dashboard"}
            {step === "otp-verify" && `OTP sent to ${loginData.phone}`}
            {step === "set-password" && (isPasswordReset ? "Create a new password for your account" : "Set a password to speed up future logins")}
            {step === "pending" && "Your account is pending admin approval"}
            {step === "rejected" && "Your account has been rejected"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "login" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-200">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="text"
                    placeholder="Enter 10-digit phone number"
                    value={loginData.phone}
                    onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (!/^\d{10}$/.test(loginData.phone.trim())) {
                      setError("Please enter your phone number first")
                      return
                    }
                    setIsPasswordReset(true)
                    await handleOtpRequest()
                  }}
                  disabled={loading}
                  className="text-sm text-green-400 hover:underline"
                >
                  Forgot password? Reset via OTP
                </button>
              </div>
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>
              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("login")}
                  type="button"
                  className="text-gray-300 hover:text-white"
                  disabled={loading}
                >
                  ← Back to Login
                </Button>
                <p className="text-xs text-gray-400">
                  Didn't receive code?{" "}
                  <button 
                    type="button" 
                    className="underline text-green-400"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}

          {step === "set-password" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-200">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={loginData.newPassword}
                    onChange={(e) => setLoginData({ ...loginData, newPassword: e.target.value })}
                    className="pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-gray-200">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={loginData.confirmPassword}
                  onChange={(e) => setLoginData({ ...loginData, confirmPassword: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Password & Continue"
                )}
              </Button>
            </form>
          )}

          {step === "pending" && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-yellow-500/20 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Account Pending Approval</h3>
                <p className="text-gray-300 mt-1">
                  Your artist account is currently under review by our admin team.
                  You will be notified once approved.
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
              <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Account Rejected</h3>
                <p className="text-gray-300 mt-1">
                  Your artist account has been rejected. Please contact support for more information.
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

          {step === "login" && (
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
          )}

          <div className="flex items-center justify-center text-sm text-gray-400 pt-4 border-t border-gray-700">
            <Shield className="h-4 w-4 mr-1" />
            Secured with end-to-end encryption
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ArtistLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ArtistLoginContent />
    </Suspense>
  )
}
