"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock, Eye, EyeOff, Loader2, LogIn, ShieldCheck } from "lucide-react"
import Link from "next/link"

export default function SimpleAdminLogin() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("") // Clear previous errors

    // --- Simple Validation ---
    if (!formData.username || !formData.password) {
      setError("Both username and password are required.")
      return
    }

    setIsLoading(true)

    // --- Simulate API Call ---
    setTimeout(() => {
      setIsLoading(false)
      // Replace with your actual authentication logic
      if (formData.username === "admin" && formData.password === "password123") {
        alert("Login Successful! Redirecting...")
        window.location.href = "/admin"
      } else {
        setError("Invalid credentials. Please try again.")
      }
    }, 1500)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-100 to-sky-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-blue-500">
        <CardHeader className="text-center">
          <div className="mx-auto w-fit p-3 bg-blue-100 rounded-full mb-4">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Admin Portal</CardTitle>
          <CardDescription className="text-gray-600">
            Welcome back! Please enter your credentials.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* --- Username Field --- */}
            <div className="space-y-2">
              <Label htmlFor="username" className="font-semibold text-gray-700">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g., admin_user"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

            {/* --- Password Field --- */}
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 h-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* --- Error Message --- */}
            {error && (
              <div className="text-center text-red-600 font-medium bg-red-100 p-2 rounded-md">
                <p>{error}</p>
              </div>
            )}

            {/* --- Submit Button --- */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
