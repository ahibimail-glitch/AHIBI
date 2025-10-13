"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PersonalInfoStep } from "./steps/personal-info-step"
import { SocialMediaStep } from "./steps/social-media-step"
import { CategoryExperienceStep } from "./steps/category-experience-step"
import { ReviewConsentStep } from "./steps/review-consent-step"
import { SuccessStep } from "./steps/success-step"
import { ChevronLeft, ChevronRight } from "lucide-react"
import TermsAndConditionsNIS from "@/app/NagalandInfluencerSummit/register/termsAndCond"

export interface FormData {
  // Personal Info
  fullName: string
  creatorName: string
  email: string
  dateOfBirth: string
  gender: string
  bio: string
  mobileNumber: string
  nagalandResident: boolean

  // Social Media
  platforms: Array<{
    platform: string
    handle: string
    profileUrl: string
    followerCount: number
    isPrimary: boolean
    engagementRate?: number
  }>
  totalFollowers: number


  // Category & Experience
  contentNiches: string[]
  customNiches: string[]
  awardCategories: string[]
  campusName?: string
  yearsActive: number
  achievements: string
  brandCollaborations: Array<{
    brandName: string
    campaignTitle: string
    year: string
    type: string
    description: string
  }>


  // Consent
  consents: {
    accuracy: boolean
    terms: boolean
    dataUsage: boolean
    emailCopy: boolean
  }
}

const initialFormData: FormData = {
  fullName: "",
  creatorName: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  bio: "",
  mobileNumber: "",
  nagalandResident: false,
  platforms: [],
  totalFollowers: 0,
  contentNiches: [],
  customNiches: [],
  awardCategories: [],
  yearsActive: 0,
  achievements: "",
  brandCollaborations: [],
  consents: {
    accuracy: false,
    terms: false,
    dataUsage: false,
    emailCopy: false,
  },
}

export function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const totalSteps = 4


  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (!isStepValid()) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  const handleSubmit = async () => {
    if (!isStepValid()) {
      setShowErrors(true)
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      // Submit to backend API
      const response = await fetch('/api/nis/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit registration')
      }

      const result = await response.json()
      
      // Store registration ID from backend response
      localStorage.setItem("nis-2025-registration-id", result.data.registrationId)
      setIsSubmitted(true)
    } catch (error: unknown) {
      console.error('Registration submission failed:', error)
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <SuccessStep />
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInfoStep formData={formData} updateFormData={updateFormData} showErrors={showErrors} />
      case 2:
        return <SocialMediaStep formData={formData} updateFormData={updateFormData} showErrors={showErrors} />
      case 3:
        return <CategoryExperienceStep formData={formData} updateFormData={updateFormData} showErrors={showErrors} />
            case 4:
        return <ReviewConsentStep formData={formData} updateFormData={updateFormData} goToStep={goToStep} showErrors={showErrors} />
      default:
        return null
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.fullName &&
          formData.creatorName &&
          formData.dateOfBirth &&
          formData.gender &&
          formData.bio.length >= 50 &&
          !!formData.mobileNumber &&
          formData.nagalandResident
        )
      case 2:
        return formData.platforms.length > 0 && 
               formData.totalFollowers >= 4000 
              //  formData.platforms.every(platform => 
              //    platform.engagementRate !== undefined && 
              //    platform.engagementRate > 0 && 
              //    platform.engagementRate <= 100
              //  )
      case 3:
        const hasContentNiches = formData.contentNiches.length > 0
        const hasCustomNiches = !formData.contentNiches.includes("others") || formData.customNiches.length > 0
        const allCustomNichesFilled = !formData.contentNiches.includes("others") || formData.customNiches.every(niche => niche.trim() !== "")
        const hasAwardCategories = formData.awardCategories.length > 0 && formData.awardCategories.length <= 3
        const campusCategorySelected = formData.awardCategories.includes("campus-voice")
        const campusValid = !campusCategorySelected || (formData.campusName || "").trim() !== ""
        return hasContentNiches && hasCustomNiches && allCustomNichesFilled && hasAwardCategories && campusValid
            case 4:
        return formData.consents.accuracy && formData.consents.terms && formData.consents.dataUsage
      default:
        return false
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <img src="/images/NIS-logo.png"/>
        <p className="text-xl text-muted-foreground">Content Creator Awards Registration</p>
      </div>
      <TermsAndConditionsNIS/>

      {/* Progress Bar */}
      <Card className="glass mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => goToStep(i + 1)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                  i + 1 === currentStep
                    ? "bg-primary text-primary-foreground"
                    : i + 1 < currentStep
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Step */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-2xl">
            {currentStep === 1 && "Personal Information"}
            {currentStep === 2 && "Social Media Presence"}
            {currentStep === 3 && "Category & Experience"}
                        {currentStep === 4 && "Review & Consent"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>

      {/* Error Display */}
      {submitError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{submitError}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2 bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        {currentStep === totalSteps ? (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            className="gradient-primary flex items-center gap-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        ) : (
          <Button 
            onClick={nextStep} 
            className="gradient-primary flex items-center gap-2"
            disabled={false}
          >
            {'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
