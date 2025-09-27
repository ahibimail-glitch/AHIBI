"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { X, Instagram, Youtube, Facebook, Twitter, Linkedin, Users, ExternalLink, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FormData } from "../nis-registration-form"

interface SocialMediaStepProps {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  showErrors?: boolean
}

const platformIcons = {
  Instagram: Instagram,
  YouTube: Youtube,
  Facebook: Facebook,
  TikTok: Users,
  Twitter: Twitter,
  LinkedIn: Linkedin,
  Other: Users,
}

const platformColors = {
  Instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  YouTube: "bg-red-500",
  Facebook: "bg-blue-600",
  TikTok: "bg-black",
  Twitter: "bg-blue-400",
  LinkedIn: "bg-blue-700",
  Other: "bg-gray-500",
}

export function SocialMediaStep({ formData, updateFormData, showErrors }: SocialMediaStepProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const platforms = ["Instagram", "YouTube", "Facebook", "TikTok", "Twitter", "LinkedIn", "Other"]

  const addPlatform = (platform: string) => {
    if (!formData.platforms.find((p) => p.platform === platform)) {
      const newPlatform = {
        platform,
        handle: "",
        profileUrl: "",
        followerCount: 0,
        isPrimary: formData.platforms.length === 0,
        engagementRate: undefined,
      }
      updateFormData({
        platforms: [...formData.platforms, newPlatform],
      })
    }
  }

  const removePlatform = (index: number) => {
    const newPlatforms = formData.platforms.filter((_, i) => i !== index)
    updateFormData({ platforms: newPlatforms })
    calculateTotalFollowers(newPlatforms)
  }

  const updatePlatform = (index: number, updates: any) => {
    const newPlatforms = formData.platforms.map((platform, i) => (i === index ? { ...platform, ...updates } : platform))
    updateFormData({ platforms: newPlatforms })
    calculateTotalFollowers(newPlatforms)
  }

  const setPrimaryPlatform = (index: number) => {
    const newPlatforms = formData.platforms.map((platform, i) => ({
      ...platform,
      isPrimary: i === index,
    }))
    updateFormData({ platforms: newPlatforms })
  }

  const calculateTotalFollowers = (platforms: any[]) => {
    const total = platforms.reduce((sum, platform) => sum + (platform.followerCount || 0), 0)
    updateFormData({ totalFollowers: total })
  }

  const validateUrl = (url: string, platform: string) => {
    if (!url) return false
    const platformDomains = {
      Instagram: "instagram.com",
      YouTube: "youtube.com",
      Facebook: "facebook.com",
      TikTok: "tiktok.com",
      Twitter: "twitter.com",
      LinkedIn: "linkedin.com",
    }
    return platform === "Other" || url.includes(platformDomains[platform as keyof typeof platformDomains] || "")
  }

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Your Platforms</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {platforms.map((platform) => {
            const Icon = platformIcons[platform as keyof typeof platformIcons]
            const isSelected = formData.platforms.some((p) => p.platform === platform)

            return (
              <Button
                key={platform}
                variant={isSelected ? "default" : "outline"}
                onClick={() => addPlatform(platform)}
                disabled={isSelected}
                className={`h-20 flex flex-col gap-2 ${isSelected ? platformColors[platform as keyof typeof platformColors] : ""}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs">{platform}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Platform Details */}
      {formData.platforms.map((platform, index) => {
        const Icon = platformIcons[platform.platform as keyof typeof platformIcons]
        const isUrlValid = validateUrl(platform.profileUrl, platform.platform)

        return (
          <Card key={index} className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="w-5 h-5" />
                  {platform.platform}
                  {platform.isPrimary && <Badge variant="secondary">Primary</Badge>}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePlatform(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Handle/Username *</Label>
                  <Input
                    value={platform.handle}
                    onChange={(e) => updatePlatform(index, { handle: e.target.value })}
                    placeholder="@yourusername"
                    className={`glass ${showErrors && !platform.handle ? "border-destructive" : ""}`}
                  />
                  {showErrors && !platform.handle && (
                    <p className="text-xs text-destructive">Please enter your handle for this platform.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Follower Count *</Label>
                  <Input
                    type="number"
                    value={platform.followerCount || ""}
                    onChange={(e) => updatePlatform(index, { followerCount: Number.parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className={`glass ${showErrors && !platform.followerCount ? "border-destructive" : ""}`}
                  />
                  {showErrors && !platform.followerCount && (
                    <p className="text-xs text-destructive">Please enter follower count.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Profile URL *
                  {platform.profileUrl && (
                    <a
                      href={platform.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </Label>
                <Input
                  value={platform.profileUrl}
                  onChange={(e) => updatePlatform(index, { profileUrl: e.target.value })}
                  placeholder={`https://${platform.platform.toLowerCase()}.com/yourusername`}
                  className={`glass ${(!isUrlValid && platform.profileUrl) || (showErrors && !platform.profileUrl) ? "border-destructive" : ""}`}
                />
                {((!isUrlValid && platform.profileUrl) || (showErrors && !platform.profileUrl)) && (
                  <p className="text-xs text-destructive">Please enter a valid {platform.platform} URL</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Average Engagement Rate (%) <span className="text-destructive">*</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How to calculate: (Likes + Shares + Comments) / Total followers × 100</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-xs text-muted-foreground">Formula: (Likes + Shares + Comments) / Total followers × 100</p>
                  <Input
                    type="number"
                    step="0.1"
                    value={platform.engagementRate || ""}
                    onChange={(e) =>
                      updatePlatform(index, { engagementRate: Number.parseFloat(e.target.value) || undefined })
                    }
                    placeholder="e.g., 3.5"
                    className={`glass ${showErrors && (platform.engagementRate === undefined || platform.engagementRate === null) ? 'border-destructive' : ''}`}
                  />
                  {showErrors && (platform.engagementRate === undefined || platform.engagementRate === null) && (
                    <p className="text-xs text-destructive">Engagement rate is required</p>
                  )}
                </div>

                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`primary-${index}`}
                      checked={platform.isPrimary}
                      onCheckedChange={() => setPrimaryPlatform(index)}
                    />
                    <Label htmlFor={`primary-${index}`} className="text-sm">
                      Mark as Primary Platform
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Checkbox id={`public-${index}`} defaultChecked disabled />
                <Label htmlFor={`public-${index}`}>I confirm this profile is public and accessible</Label>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Follower Counter */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Total Follower Count
            </h3>
            <div className="text-3xl font-bold text-primary">{formData.totalFollowers.toLocaleString()}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Minimum Required: 4,000</span>
                <span className={formData.totalFollowers >= 4000 ? "text-green-500" : "text-destructive"}>
                  {formData.totalFollowers >= 4000 ? "✓ Eligible" : "✗ Not Eligible"}
                </span>
              </div>
              <Progress value={Math.min((formData.totalFollowers / 4000) * 100, 100)} className="h-2" />
            </div>
            {formData.totalFollowers < 4000 && (
              <p className="text-sm text-destructive">
                You need at least 4,000 total followers across all platforms to be eligible.
              </p>
            )}
            {showErrors && formData.platforms.length === 0 && (
              <p className="text-sm text-destructive">Please add at least one platform.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
