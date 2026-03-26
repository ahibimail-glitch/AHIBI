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
import { Mail, Shield, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

function OrganizerLoginContent() {
  const searchParams = useSearchParams()
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'), '/organizer/dashboard')
  const [step, setStep] = useState<"login" | "otp-verify" | "set-password" | "pending" | "rejected">("login")
  const [loginData, setLoginData] = useState({
    phone: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
    rememberMe: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [tempToken, setTempToken] = useState("")

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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
      const response = await fetch(`${apiUrl}/api/organizer/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginData.phone.trim(), password: loginData.password }),
      })

      const data = await response.json()

      if (response.status === 202) {
        setStep("pending")
      } else if (response.status === 403) {
        setStep("rejected")
      } else if (response.ok && data.success) {
        localStorage.setItem('organizer_token', data.data.token)
        localStorage.setItem('organizer_user', JSON.stringify(data.data.user))
        window.location.href = redirectUrl
      } else if (data.requiresOtp) {
        setError("No password set. Use \"Forgot password?\" below to set one via OTP.")
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sendOtpRequest = async (phone: string) => {
    setError("")
    setSuccessMessage("")
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/organizer/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: 'login' }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to send OTP')
        return false
      }
      setSuccessMessage("OTP sent successfully! Check your phone.")
      setStep("otp-verify")
      return true
    } catch (err) {
      setError('Network error. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      setLoading(true)
      const response = await fetch(`${apiUrl}/api/organizer/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginData.phone.trim(), otp: loginData.otp, mode: 'login' }),
      })

      const data = await response.json()

      if (response.status === 202) {
        setStep("pending")
      } else if (response.status === 403) {
        setStep("rejected")
      } else if (response.ok && data.success) {
        setTempToken(data.data.token)
        if (!data.data.hasPassword || isPasswordReset) {
          setStep("set-password")
        } else {
          localStorage.setItem('organizer_token', data.data.token)
          localStorage.setItem('organizer_user', JSON.stringify(data.data.user))
          window.location.href = redirectUrl
        }
      } else {
        setError(data.message || 'Invalid OTP')
      }
    } catch (err) {
      setError('Network error. Please try again.')
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
      const response = await fetch(`${apiUrl}/api/organizer/auth/setup-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ password: loginData.newPassword }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('organizer_token', tempToken)
        window.location.href = redirectUrl
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
    setError("")
    setSuccessMessage("")
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/organizer/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginData.phone.trim(), mode: 'login' }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setSuccessMessage("OTP resent successfully!")
      } else {
        setError(data.message || 'Failed to resend OTP')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-white-900 to-white flex items-center justify-center p-4">
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
            {step === "login" && "Organizer Login"}
            {step === "otp-verify" && (isPasswordReset ? "Reset Password" : "Verify OTP")}
            {step === "set-password" && (isPasswordReset ? "Set New Password" : "Set Your Password")}
            {step === "pending" && "Account Pending"}
            {step === "rejected" && "Account Rejected"}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {step === "login" && "Access your event organizer dashboard"}
            {step === "otp-verify" && `OTP sent to ${loginData.phone}`}
            {step === "set-password" && (isPasswordReset ? "Create a new password for your account" : "Set a password to speed up future logins")}
            {step === "pending" && "Your account is pending admin approval"}
            {step === "rejected" && "Your account has been rejected"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "login" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone-pw" className="text-gray-200">Phone Number</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone-pw"
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    value={loginData.phone}
                    onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
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
                  id="remember-pw"
                  checked={loginData.rememberMe}
                  onCheckedChange={(checked) => setLoginData({ ...loginData, rememberMe: checked as boolean })}
                  className="border-gray-600 data-[state=checked]:bg-purple-600"
                />
                <Label htmlFor="remember-pw" className="text-gray-300">Remember me</Label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 transition-opacity"
              >
                {loading ? "Logging in..." : "Login"}
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
                    await sendOtpRequest(loginData.phone.trim())
                  }}
                  disabled={loading}
                  className="text-sm text-purple-400 hover:underline"
                >
                  Forgot password? Reset via OTP
                </button>
              </div>
            </form>
          )}

          {step === "set-password" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-200">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={loginData.newPassword}
                    onChange={(e) => setLoginData({ ...loginData, newPassword: e.target.value })}
                    className="pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
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
                <Label htmlFor="confirm-password" className="text-gray-200">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={loginData.confirmPassword}
                  onChange={(e) => setLoginData({ ...loginData, confirmPassword: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 transition-opacity"
              >
                {loading ? "Saving..." : "Save Password & Continue"}
              </Button>
            </form>
          )}

          {step === "otp-verify" && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md text-green-400 text-sm">
                  {successMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-gray-200">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="6-digit code"
                  value={loginData.otp}
                  onChange={(e) => setLoginData({ ...loginData, otp: e.target.value })}
                  maxLength={6}
                  className="text-center text-lg tracking-widest bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 transition-opacity"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep("login"); setError(""); setSuccessMessage(""); setLoginData({ ...loginData, otp: "" }) }}
                  type="button"
                  className="text-gray-300 hover:text-white"
                >
                  ← Back to Login
                </Button>
                <p className="text-xs text-gray-400">
                  Didn't receive code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="underline text-purple-400"
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
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
                  Your organizer account is currently under review by our admin team.
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
                  Your organizer account has been rejected. Please contact support for more information.
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
              <Link href="/organizer/auth/signup" className="text-purple-400 hover:underline">
                Sign Up
              </Link>
            </p>
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              ← Back to Home
            </Link>
          </div>

          <div className="flex items-center justify-center text-sm text-gray-400 pt-4 border-t border-gray-700">
            <Shield className="h-4 w-4 mr-1" />
            Secured with end-to-end encryption
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OrganizerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <OrganizerLoginContent />
    </Suspense>
  )
}
