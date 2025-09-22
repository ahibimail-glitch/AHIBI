"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, User, Mail, MessageSquare } from "lucide-react"
import type { FormData } from "../nis-registration-form"

interface PersonalInfoStepProps {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  showErrors?: boolean
}

export function PersonalInfoStep({ formData, updateFormData, showErrors }: PersonalInfoStepProps) {
  const [age, setAge] = useState<number | null>(null)
  const [bioLength, setBioLength] = useState(formData.bio.length)

  useEffect(() => {
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        setAge(calculatedAge - 1)
      } else {
        setAge(calculatedAge)
      }
    }
  }, [formData.dateOfBirth])

  const handleBioChange = (value: string) => {
    setBioLength(value.length)
    updateFormData({ bio: value })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name *
          </Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => updateFormData({ fullName: e.target.value })}
            placeholder="Enter your full name"
            className={`glass ${showErrors && !formData.fullName ? "border-destructive" : ""}`}
          />
          {showErrors && !formData.fullName && (
            <p className="text-xs text-destructive">Please enter your full name.</p>
          )}
        </div>

        {/* Creator Name */}
        <div className="space-y-2">
          <Label htmlFor="creatorName">Creator/Handle Name *</Label>
          <Input
            id="creatorName"
            value={formData.creatorName}
            onChange={(e) => updateFormData({ creatorName: e.target.value })}
            placeholder="Your creator handle or brand name"
            className={`glass ${showErrors && !formData.creatorName ? "border-destructive" : ""}`}
          />
          {showErrors && !formData.creatorName && (
            <p className="text-xs text-destructive">Please enter your creator/handle name.</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData({ email: e.target.value })}
          placeholder="your@email.com"
          className={`glass ${showErrors && !formData.email ? "border-destructive" : ""}`}
        />
        {showErrors && !formData.email && <p className="text-xs text-destructive">Please enter your email.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Date of Birth *
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
            className={`glass ${showErrors && !formData.dateOfBirth ? "border-destructive" : ""}`}
          />
          {age !== null && <p className="text-sm text-muted-foreground">Age: {age} years</p>}
          {showErrors && !formData.dateOfBirth && (
            <p className="text-xs text-destructive">Please select your date of birth.</p>
          )}
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select value={formData.gender} onValueChange={(value) => updateFormData({ gender: value })}>
            <SelectTrigger className={`glass ${showErrors && !formData.gender ? "border-destructive" : ""}`}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
          {showErrors && !formData.gender && <p className="text-xs text-destructive">Please select a gender.</p>}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
        Bio
        </Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => handleBioChange(e.target.value)}
          placeholder="Tell us about yourself, your content, and your journey as an influencer .... "
          className={`glass min-h-[120px] ${showErrors && bioLength < 50 ? "border-destructive" : ""}`}
          maxLength={1000}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Minimum 50 characters required</span>
          <span
            className={bioLength < 50 ? "text-destructive" : bioLength > 900 ? "text-yellow-500" : "text-green-500"}
          >
            {bioLength}/1000
          </span>
        </div>
        {showErrors && bioLength < 50 && (
          <p className="text-xs text-destructive">Bio must be at least 50 characters.</p>
        )}
      </div>

      {/* Nagaland Resident Confirmation */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="nagalandResident"
              checked={formData.nagalandResident}
              onCheckedChange={(checked) => updateFormData({ nagalandResident: checked as boolean })}
            />
            <div className="space-y-1">
              <Label htmlFor="nagalandResident" className="text-sm font-medium">
                I confirm that I am a resident of Nagaland *
              </Label>
              <p className="text-xs text-muted-foreground">
                This confirmation is required for eligibility in the Nagaland Influencers Summit 2025 awards.
              </p>
              {showErrors && !formData.nagalandResident && (
                <p className="text-xs text-destructive">You must confirm you are a Nagaland resident.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
