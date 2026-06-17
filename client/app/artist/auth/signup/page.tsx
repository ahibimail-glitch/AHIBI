"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Ticket,
  Music,
  User,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * Premium Green Gradient UI (C1)
 * - upgraded visual styles for inputs / selects / buttons
 * - kept your original logic and API calls intact
 *
 * Drop-in replacement for your original file (no logic changes)
 */

const SIGNUP_DRAFT_KEY = "artist_signup_draft"

export default function ArtistSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<"details" | "otp" | "complete">("details")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    city: "",
    specialization: "",
    experience: "",
    agreeToTerms: false,
  })
  const [otp, setOtp] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem(SIGNUP_DRAFT_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      setSignupData((prev) => ({
        ...prev,
        ...parsed,
        password: "",
        confirmPassword: "",
        agreeToTerms: Boolean(parsed.agreeToTerms),
      }))
    } catch {
      sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    if (step !== "details") return

    const { password, confirmPassword, ...draft } = signupData
    sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft))
  }, [signupData, step])

  const validatePasswordFields = () => {
    if (!signupData.password) {
      setError("Password is required")
      return false
    }
    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return false
    }
    if (!signupData.confirmPassword) {
      setError("Please confirm your password")
      return false
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!validatePasswordFields()) {
      setLoading(false)
      return
    }

    try {
      // First, send OTP to the phone number
      const otpResponse = await fetch("/api/artist/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: signupData.phone,
          mode: "signup", // Specify that this is for signup
        }),
      })

      const otpData = await otpResponse.json()

      if (!otpResponse.ok) {
        throw new Error(otpData.message || "Failed to send OTP")
      }

      setStep("otp")
    } catch (error) {
      console.error("Error sending OTP:", error)
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send OTP. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // First verify the OTP
      const verifyResponse = await fetch("/api/artist/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: signupData.phone,
          otp: otp,
          mode: "signup",
        }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        throw new Error(verifyData.message || "Failed to verify OTP")
      }

      // Then register the artist
      const signupResponse = await fetch("/api/artist/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          phone: signupData.phone,
          password: signupData.password,
          city: signupData.city,
          specialization: signupData.specialization,
          experience: signupData.experience,
        }),
      })

      const signupResponseData = await signupResponse.json()

      if (!signupResponse.ok) {
        throw new Error(
          signupResponseData.message || "Failed to create artist account"
        )
      }

      // Save token and user data to localStorage if provided in response
      if (signupResponseData.data?.token) {
        localStorage.setItem("artist_token", signupResponseData.data.token)
      }

      if (signupResponseData.data?.user) {
        localStorage.setItem(
          "artist_user",
          JSON.stringify(signupResponseData.data.user)
        )
      }

      setStep("complete")
      sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
    } catch (error) {
      console.error("Error during signup:", error)
      setError(
        error instanceof Error
          ? error.message
          : "Failed to complete signup. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/artist/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: signupData.phone,
          mode: "signup",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend OTP")
      }

      // Show success message
      alert("OTP has been resent successfully")
    } catch (error) {
      console.error("Error resending OTP:", error)
      setError(
        error instanceof Error
          ? error.message
          : "Failed to resend OTP. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    router.push("/artist/dashboard")
  }

  /* --- Shared style snippets (Tailwind classes) --- */
  const inputBase =
    "pl-10 bg-gradient-to-tr from-gray-900 via-gray-900 to-gray-950 border border-gray-700 text-gray-50 placeholder-gray-400 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-600/40 focus:border-green-500 transition-shadow"
  const triggerBase =
    "bg-gradient-to-tr from-gray-900 via-gray-900 to-gray-950 border border-gray-700 text-gray-50 rounded-md py-2 px-3 w-full flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-green-600/40 focus:border-green-500 transition-shadow"
  const selectContentBase =
    "bg-gradient-to-br from-gray-900/95 to-gray-900 border border-gray-800 text-gray-50 rounded-md shadow-2xl p-1 max-h-60 overflow-auto"
  const selectItemBase =
    "px-3 py-2 rounded-md text-sm select-none cursor-pointer hover:bg-green-700/20 data-[state=checked]:bg-green-700/30"

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400/60 via-green-400/30 to-transparent flex items-center justify-center p-6">
      <Card className="w-full max-w-lg bg-gradient-to-br from-gray-900/95 to-gray-900/80 border border-gray-800 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center space-x-3">
              <img
                src="/images/Logo.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain"
              />
              <div className="text-left">
                <h2 className="text-white font-bold">Ahibi</h2>
                <p className="text-xs text-gray-400 -mt-1">Artist Hub</p>
              </div>
            </div>
          </div>
          <CardTitle className="text-white text-2xl">
            {step === "details" && "Create Artist Account"}
            {step === "otp" && "Verify Your Phone"}
            {step === "complete" && "Welcome to Ahibi!"}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {step === "details" && "Showcase your talent to the world"}
            {step === "otp" && `We've sent a 6-digit code to ${signupData.phone}`}
            {step === "complete" && "Your artist profile is ready"}
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

          {step === "details" && (
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-200">
                  Artist Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="Enter your artist name"
                    value={signupData.name}
                    onChange={(e) =>
                      setSignupData({ ...signupData, name: e.target.value })
                    }
                    className={`${inputBase} pl-10`}
                    required
                  />
                </div>
              </div>

              {/* Email */}
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
                    className={`${inputBase} pl-10`}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-200">
                  Mobile Number *
                </Label>
                <div className="flex">
                  <div className="flex items-center px-3 rounded-l-md bg-gray-800 border border-r-0 border-gray-700">
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
                    className={`${inputBase} rounded-l-none`}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200">
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    className={`${inputBase} pr-10`}
                    required
                    minLength={6}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-200">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={signupData.confirmPassword}
                    onChange={(e) =>
                      setSignupData({ ...signupData, confirmPassword: e.target.value })
                    }
                    className={`${inputBase} pr-10`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-200">
                  City *
                </Label>
                <Input
                  id="city"
                  placeholder="Enter your city"
                  value={signupData.city}
                  onChange={(e) =>
                    setSignupData({ ...signupData, city: e.target.value })
                  }
                  className={`${inputBase}`}
                  required
                />
              </div>

              {/* Specialization */}
              <div className="space-y-2">
                <Label htmlFor="specialization" className="text-gray-200">
                  Specialization *
                </Label>
                <Select
                  value={signupData.specialization}
                  onValueChange={(value) =>
                    setSignupData({ ...signupData, specialization: value })
                  }
                >
                  <SelectTrigger className={triggerBase} aria-label="Select specialization">
                    <SelectValue placeholder="Select your specialization" />
                  </SelectTrigger>

                  <SelectContent className={selectContentBase}>
                    <SelectItem value="musician" className={selectItemBase}>
                      Musician
                    </SelectItem>
                    <SelectItem value="singer" className={selectItemBase}>
                      Singer
                    </SelectItem>
                    <SelectItem value="dj" className={selectItemBase}>
                      DJ
                    </SelectItem>
                    <SelectItem value="comedian" className={selectItemBase}>
                      Comedian
                    </SelectItem>
                    <SelectItem value="dancer" className={selectItemBase}>
                      Dancer
                    </SelectItem>
                    <SelectItem value="performer" className={selectItemBase}>
                      Performer
                    </SelectItem>
                    <SelectItem value="band" className={selectItemBase}>
                      Band
                    </SelectItem>
                    <SelectItem value="magician" className={selectItemBase}>
                      Magician
                    </SelectItem>
                    <SelectItem value="instrumentalist" className={selectItemBase}>
                      Instrumentalist
                    </SelectItem>
                    <SelectItem value="speaker" className={selectItemBase}>
                      Public Speaker
                    </SelectItem>
                    <SelectItem value="other" className={selectItemBase}>
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-gray-200">
                  Experience Level *
                </Label>
                <Select
                  value={signupData.experience}
                  onValueChange={(value) =>
                    setSignupData({ ...signupData, experience: value })
                  }
                >
                  <SelectTrigger className={triggerBase} aria-label="Select experience">
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>

                  <SelectContent className={selectContentBase}>
                    <SelectItem value="beginner" className={selectItemBase}>
                      Beginner (0-2 years)
                    </SelectItem>
                    <SelectItem value="intermediate" className={selectItemBase}>
                      Intermediate (2-5 years)
                    </SelectItem>
                    <SelectItem value="experienced" className={selectItemBase}>
                      Experienced (5-10 years)
                    </SelectItem>
                    <SelectItem value="expert" className={selectItemBase}>
                      Expert (10+ years)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-3 rounded-lg border border-gray-600 bg-gray-800/60 p-3">
                <div className="pt-0.5">
                  <Checkbox
                    id="terms"
                    checked={signupData.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setSignupData({ ...signupData, agreeToTerms: checked as boolean })
                    }
                    className="h-5 w-5 border-2 border-gray-300 bg-white data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=unchecked]:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
                  />
                </div>
                <Label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-green-400 hover:text-green-300"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-green-400 hover:text-green-300"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-95 transition-opacity shadow-lg"
                disabled={
                  loading ||
                  !signupData.agreeToTerms ||
                  !signupData.name ||
                  !signupData.email ||
                  !signupData.phone ||
                  !signupData.password ||
                  !signupData.confirmPassword ||
                  !signupData.city ||
                  !signupData.specialization ||
                  !signupData.experience
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Continue to Verification"
                )}
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
                  className="text-center text-lg tracking-widest bg-gradient-to-tr from-gray-900 to-gray-950 border border-gray-700 text-gray-50 placeholder-gray-400 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-600/40 focus:border-green-500"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-95 transition-opacity shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Phone Number"
                )}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("details")}
                  type="button"
                  className="text-gray-300 hover:text-white"
                  disabled={loading}
                >
                  ← Back to Details
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

          {step === "complete" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Account Created Successfully!</h3>
                <p className="text-gray-300">Welcome to Ahibi 3.0, {signupData.name}! Your artist profile is ready.</p>
                <p className="text-amber-400 text-sm">Your account is pending admin approval. You'll be notified once approved.</p>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg text-left border border-gray-700">
                <h4 className="font-medium mb-2 text-white">Account Details:</h4>
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
                    <strong>Specialization:</strong> {signupData.specialization}
                  </p>
                  <p>
                    <strong>Experience:</strong> {signupData.experience}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-95 transition-opacity shadow-lg"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          <div className="text-center space-y-2">
            {step === "details" && (
              <p className="text-gray-400 text-sm">
                Already have an account?{" "}
                <Link href="/artist/auth/login" className="text-green-400 hover:underline">
                  Sign In
                </Link>
              </p>
            )}
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              ← Back to Home
            </Link>
          </div>

          <div className="flex items-center justify-center text-sm text-gray-400 pt-4 border-t border-gray-800">
            <Shield className="h-4 w-4 mr-1" />
            Secured with OTP verification
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
