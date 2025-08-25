"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Ticket, Music, User, Mail, Phone, Shield, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ArtistSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<"details" | "otp" | "complete">("details")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    specialization: "",
    experience: "",
    agreeToTerms: false,
  })
  const [otp, setOtp] = useState("")

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // First, send OTP to the phone number
      const otpResponse = await fetch('/api/artist/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: signupData.phone,
          mode: 'signup' // Specify that this is for signup
        }),
      })

      const otpData = await otpResponse.json()

      if (!otpResponse.ok) {
        throw new Error(otpData.message || 'Failed to send OTP')
      }

      setStep("otp")
    } catch (error) {
      console.error('Error sending OTP:', error)
      setError(error instanceof Error ? error.message : 'Failed to send OTP. Please try again.')
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
      const verifyResponse = await fetch('/api/artist/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: signupData.phone,
          otp: otp,
          mode: 'signup'
        }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        throw new Error(verifyData.message || 'Failed to verify OTP')
      }

      // Then register the artist
      const signupResponse = await fetch('/api/artist/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          phone: signupData.phone,
          city: signupData.city,
          specialization: signupData.specialization,
          experience: signupData.experience,
        }),
      })

      const signupResponseData = await signupResponse.json()

      if (!signupResponse.ok) {
        throw new Error(signupResponseData.message || 'Failed to create artist account')
      }

      // Save token and user data to localStorage if provided in response
      if (signupResponseData.data?.token) {
        localStorage.setItem('artist_token', signupResponseData.data.token)
      }
      
      if (signupResponseData.data?.user) {
        localStorage.setItem('artist_user', JSON.stringify(signupResponseData.data.user))
      }

      setStep("complete")
    } catch (error) {
      console.error('Error during signup:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete signup. Please try again.')
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
          phone: signupData.phone,
          mode: 'signup'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP')
      }

      // Show success message
      alert('OTP has been resent successfully')
    } catch (error) {
      console.error('Error resending OTP:', error)
      setError(error instanceof Error ? error.message : 'Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    router.push('/artist/dashboard')
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
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
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
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
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
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
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
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                    className="rounded-l-none bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
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
                  onValueChange={(value) => setSignupData({ ...signupData, city: value })}
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
                <Label htmlFor="specialization" className="text-gray-200">
                  Specialization *
                </Label>
                <Select
                  value={signupData.specialization}
                  onValueChange={(value) => setSignupData({ ...signupData, specialization: value })}
                  required
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select your specialization" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="musician">Musician</SelectItem>
                    <SelectItem value="singer">Singer</SelectItem>
                    <SelectItem value="dj">DJ</SelectItem>
                    <SelectItem value="comedian">Comedian</SelectItem>
                    <SelectItem value="dancer">Dancer</SelectItem>
                    <SelectItem value="performer">Performer</SelectItem>
                    <SelectItem value="band">Band</SelectItem>
                    <SelectItem value="magician">Magician</SelectItem>
                    <SelectItem value="speaker">Public Speaker</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-gray-200">
                  Experience Level *
                </Label>
                <Select
                  value={signupData.experience}
                  onValueChange={(value) => setSignupData({ ...signupData, experience: value })}
                  required
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                    <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                    <SelectItem value="experienced">Experienced (5-10 years)</SelectItem>
                    <SelectItem value="expert">Expert (10+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={signupData.agreeToTerms}
                  onCheckedChange={(checked) => setSignupData({ ...signupData, agreeToTerms: checked as boolean })}
                  className="border-gray-600 data-[state=checked]:bg-green-600"
                />
                <Label htmlFor="terms" className="text-sm text-gray-300">
                  I agree to the{" "}
                  <Link href="/terms" className="underline text-green-400">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline text-green-400">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-90 transition-opacity"
                disabled={
                  loading ||
                  !signupData.agreeToTerms ||
                  !signupData.name ||
                  !signupData.email ||
                  !signupData.phone ||
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
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Account Created Successfully!</h3>
                <p className="text-gray-300">Welcome to Ahibi 3.0, {signupData.name}! Your artist profile is ready.</p>
                <p className="text-amber-400 text-sm">Your account is pending admin approval. You'll be notified once approved.</p>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg text-left border border-gray-600">
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
                className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:opacity-90 transition-opacity"
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

          <div className="flex items-center justify-center text-sm text-gray-400 pt-4 border-t border-gray-700">
            <Shield className="h-4 w-4 mr-1" />
            Secured with OTP verification
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
