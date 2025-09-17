"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Edit, User, Users, FileText, Award, Check } from "lucide-react"
import { useState } from "react"
import type { FormData } from "../nis-registration-form"

interface ReviewConsentStepProps {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  goToStep: (step: number) => void
}

export function ReviewConsentStep({ formData, updateFormData, goToStep }: ReviewConsentStepProps) {
  const [openSections, setOpenSections] = useState<string[]>(["personal"])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  const updateConsent = (key: keyof FormData["consents"], value: boolean) => {
    updateFormData({
      consents: {
        ...formData.consents,
        [key]: value,
      },
    })
  }

  const requiredConsentsCount = Object.values(formData.consents).slice(0, 3).filter(Boolean).length
  const allRequiredConsentsGiven = requiredConsentsCount === 3

  return (
    <div className="space-y-6">
      {/* Application Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Application Summary</h3>

        {/* Personal Information */}
        <Collapsible open={openSections.includes("personal")} onOpenChange={() => toggleSection("personal")}>
          <Card className="glass">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToStep(1)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Full Name:</span> {formData.fullName}
                  </div>
                  <div>
                    <span className="font-medium">Creator Name:</span> {formData.creatorName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {formData.email}
                  </div>
                  <div>
                    <span className="font-medium">Date of Birth:</span> {formData.dateOfBirth}
                  </div>
                  <div>
                    <span className="font-medium">Gender:</span> {formData.gender}
                  </div>
                  <div>
                    <span className="font-medium">Nagaland Resident:</span>
                    {formData.nagalandResident ? <Check className="w-4 h-4 inline text-green-500 ml-1" /> : "No"}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Bio:</span> {formData.bio}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Social Media */}
        <Collapsible open={openSections.includes("social")} onOpenChange={() => toggleSection("social")}>
          <Card className="glass">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5" />
                    Social Media Presence
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToStep(2)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-lg font-medium">Total Followers: {formData.totalFollowers.toLocaleString()}</div>
                  {formData.platforms.map((platform, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{platform.platform}</span>
                          {platform.isPrimary && <Badge variant="secondary">Primary</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {platform.handle} • {platform.followerCount.toLocaleString()} followers
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Content Portfolio */}
        <Collapsible open={openSections.includes("content")} onOpenChange={() => toggleSection("content")}>
          <Card className="glass">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    Content Portfolio
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToStep(3)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Top Content Pieces:</span> {formData.topContent.length}
                  </div>
                  <div>
                    <span className="font-medium">Analytics File:</span>
                    {formData.analyticsFile ? formData.analyticsFile.name : "Not uploaded"}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Category & Experience */}
        <Collapsible open={openSections.includes("category")} onOpenChange={() => toggleSection("category")}>
          <Card className="glass">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="w-5 h-5" />
                    Category & Experience
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToStep(4)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Content Niches:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.contentNiches.map((niche) => (
                        <Badge key={niche} variant="outline">
                          {niche}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Award Category:</span> {formData.awardCategory}
                  </div>
                  <div>
                    <span className="font-medium">Years Active:</span> {formData.yearsActive} years
                  </div>
                  <div>
                    <span className="font-medium">Brand Collaborations:</span> {formData.brandCollaborations.length}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Consent Section */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Required Consent</CardTitle>
          <p className="text-sm text-muted-foreground">
            Please review and accept the following terms to complete your registration.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="accuracy"
                checked={formData.consents.accuracy}
                onCheckedChange={(checked) => updateConsent("accuracy", checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="accuracy" className="text-sm font-medium">
                  I confirm all information provided is true and accurate *
                </Label>
                <p className="text-xs text-muted-foreground">
                  False information may result in disqualification from the awards.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={formData.consents.terms}
                onCheckedChange={(checked) => updateConsent("terms", checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="terms" className="text-sm font-medium">
                  I agree to NIS 2025 terms & conditions *
                </Label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you agree to abide by all event terms and conditions.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="dataUsage"
                checked={formData.consents.dataUsage}
                onCheckedChange={(checked) => updateConsent("dataUsage", checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="dataUsage" className="text-sm font-medium">
                  I consent to data usage for event communication and publicity *
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your information will be used for event-related communications and promotional materials.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="emailCopy"
                checked={formData.consents.emailCopy}
                onCheckedChange={(checked) => updateConsent("emailCopy", checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="emailCopy" className="text-sm font-medium">
                  Send me a copy of my registration
                </Label>
                <p className="text-xs text-muted-foreground">
                  Optional: Receive a PDF copy of your registration via email.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Required consents completed:</span>
              <Badge variant={allRequiredConsentsGiven ? "default" : "destructive"}>{requiredConsentsCount}/3</Badge>
            </div>
            {!allRequiredConsentsGiven && (
              <p className="text-xs text-destructive mt-2">
                Please accept all required consents to proceed with submission.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
