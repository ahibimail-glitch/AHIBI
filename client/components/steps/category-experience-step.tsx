"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  X,
  Camera,
  Utensils,
  Plane,
  Dumbbell,
  Laptop,
  GraduationCap,
  Music,
  Palette,
  Briefcase,
  Heart,
  Gamepad2,
  Award,
  Users,
  Edit3,
} from "lucide-react"
import type { FormData } from "../nis-registration-form"
import { getNicheLabel } from "@/lib/niche-labels"

interface CategoryExperienceStepProps {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  showErrors?: boolean
}

const contentNiches = [
  { id: "lifestyle", label: "Lifestyle", icon: Users },
  { id: "fashion-beauty", label: "Fashion & Beauty", icon: Camera },
  { id: "food", label: "Food", icon: Utensils },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "technology", label: "Technology", icon: Laptop },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "entertainment", label: "Entertainment", icon: Music },
  { id: "music", label: "Music", icon: Music },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "art", label: "Art", icon: Palette },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "health-wellness", label: "Health & Wellness", icon: Heart },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "others", label: "Others (Specify)", icon: Edit3 },
]

const awardCategories = [
  { id: "fashion-voice", label: "Fashion Voice of the Year", description: "Outstanding fashion content and influence" },
  {
    id: "beauty-glamour",
    label: "Beauty & Glamour Creator Award",
    description: "Excellence in beauty and glamour content",
  },
  {
    id: "entertainment-impact",
    label: "Entertainment Impact Award",
    description: "Significant impact in entertainment content",
  },
  { id: "food-storytelling", label: "Food Storytelling Award", description: "Creative food content and storytelling" },
  { id: "photography", label: "Photography Award", description: "Outstanding photography and visual content" },
  { id: "visual-storyteller", label: "Visual Storyteller Award", description: "Excellence in visual storytelling" },
  { id: "creative-visuals", label: "Creative Visuals Award", description: "Innovation in visual content creation" },
  { id: "music-voice", label: "Music Voice Award", description: "Outstanding music content and influence" },
  {
    id: "knowledge-creator",
    label: "Knowledge Creator Award",
    description: "Educational and informative content excellence",
  },
  { id: "campus-voice", label: "Campus Voice of the Year", description: "Outstanding campus and student content" },
  { id: "rising-creator", label: "Rising Creator Award (U-21)", description: "Best emerging creator under 21" },
  {
    id: "cultural-heritage",
    label: "Cultural Heritage Voice Award",
    description: "Promoting cultural heritage and traditions",
  },
  { id: "peoples-choice", label: "People's Choice Award", description: "Most popular creator by public vote" },
  {
    id: "content-excellence",
    label: "Content Excellence Award",
    description: "Overall content quality and consistency",
  },
  {
    id: "responsible-influence",
    label: "Responsible Influence Award",
    description: "Positive social impact and responsibility",
  },
  { id: "digital-impact", label: "Digital Impact Leadership Award", description: "Leadership in digital innovation" },
  {
    id: "public-communication",
    label: "Public Communication Excellence Award",
    description: "Excellence in public communication",
  },
  { id: "explorers-spirit", label: "Explorer's Spirit Award", description: "Adventure and exploration content" },
  { id: "community-impact", label: "Community Impact Award", description: "Positive community engagement and impact" },
  {
    id: "media-integrity-print",
    label: "Media Integrity Award (Print)",
    description: "Excellence in print media integrity",
  },
  {
    id: "media-integrity-digital",
    label: "Media Integrity Award (Digital)",
    description: "Excellence in digital media integrity",
  },
]

const collaborationTypes = [
  "Sponsored Post",
  "Brand Ambassador",
  "Product Review",
  "Event Coverage",
  "Content Partnership",
  "Affiliate Marketing",
]

export function CategoryExperienceStep({ formData, updateFormData, showErrors }: CategoryExperienceStepProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const toggleNiche = (nicheId: string) => {
    const newNiches = formData.contentNiches.includes(nicheId)
      ? formData.contentNiches.filter((id) => id !== nicheId)
      : [...formData.contentNiches, nicheId]
    updateFormData({ contentNiches: newNiches })
  }

  const addCollaboration = () => {
    const newCollaboration = {
      brandName: "",
      campaignTitle: "",
      year: "",
      type: "",
      description: "",
    }
    updateFormData({
      brandCollaborations: [...formData.brandCollaborations, newCollaboration],
    })
  }

  const removeCollaboration = (index: number) => {
    const newCollaborations = formData.brandCollaborations.filter((_, i) => i !== index)
    updateFormData({ brandCollaborations: newCollaborations })
  }

  const updateCollaboration = (index: number, updates: any) => {
    const newCollaborations = formData.brandCollaborations.map((collab, i) =>
      i === index ? { ...collab, ...updates } : collab,
    )
    updateFormData({ brandCollaborations: newCollaborations })
  }

  const filteredCategories = awardCategories.filter(
    (category) =>
      category.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Content Niche Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Content Niche Selection *</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {contentNiches.map((niche) => {
            const Icon = niche.icon
            const isSelected = formData.contentNiches.includes(niche.id)

            return (
              <Card
                key={niche.id}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  isSelected ? "ring-2 ring-primary bg-primary/10" : "glass hover:bg-muted/20"
                }`}
                onClick={() => toggleNiche(niche.id)}
              >
                <CardContent className="p-4 text-center">
                  <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">{niche.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">Selected niches:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.contentNiches.map((nicheId) => {
              const niche = contentNiches.find((n) => n.id === nicheId)
              return niche ? (
                <Badge key={nicheId} variant="secondary">
                  {niche.label}
                </Badge>
              ) : null
            })}
          </div>
          {showErrors && formData.contentNiches.length === 0 && (
            <p className="text-xs text-destructive mt-2">Please select at least one content niche.</p>
          )}
        </div>
      </div>

      {/* Custom Niches Input */}
      {formData.contentNiches.includes("others") && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Specify Other Content Niches *</h3>
          <div className="space-y-3">
            {formData.customNiches.map((niche, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={niche}
                  onChange={(e) => {
                    const newCustomNiches = [...formData.customNiches];
                    newCustomNiches[index] = e.target.value;
                    updateFormData({ customNiches: newCustomNiches });
                  }}
                  placeholder="Enter your niche category"
                  className={`glass ${showErrors && niche.trim() === "" ? "border-destructive" : ""}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newCustomNiches = formData.customNiches.filter((_, i) => i !== index);
                    updateFormData({ customNiches: newCustomNiches });
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              onClick={() => {
                updateFormData({ customNiches: [...formData.customNiches, ""] });
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
            >
              <Plus className="w-4 h-4" />
              Add Custom Niche
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Please specify at least one custom niche category if you selected "Others".
          </p>
          {showErrors && formData.customNiches.some((n) => n.trim() === "") && (
            <p className="text-xs text-destructive">Please fill all custom niche fields.</p>
          )}
        </div>
      )}

      {/* Award Category Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Award Category Selection *</h3>
        <div className="space-y-4">
          <Input
            placeholder="Search award categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass"
          />

          <div className="py-4 px-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover:scale-[1.02] ${
                  formData.awardCategory === category.id
                    ? "ring-2 ring-primary bg-primary/10"
                    : `glass hover:bg-muted/20${showErrors && !formData.awardCategory ? ' border-destructive' : ''}`
                }`}
                onClick={() => updateFormData({ awardCategory: category.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">{category.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        {showErrors && !formData.awardCategory && (
          <p className="text-xs text-destructive mt-2">Please select an award category.</p>
        )}
      </div>

      {/* Campus Name (conditional) */}
      {formData.awardCategory === "campus-voice" && (
        <div className="space-y-2">
          <Label htmlFor="campusName">Campus Name *</Label>
          <Input
            id="campusName"
            value={formData.campusName || ""}
            onChange={(e) => updateFormData({ campusName: e.target.value })}
            placeholder="Enter your campus/university name"
            className={`glass ${showErrors && !(formData.campusName || "").trim() ? "border-destructive" : ""}`}
          />
          {showErrors && !(formData.campusName || "").trim() && (
            <p className="text-xs text-destructive">Please enter campus name.</p>
          )}
        </div>
      )}

      {/* Years Active */}
      <div className="space-y-4">
        <Label>Years Active as Content Creator: {formData.yearsActive} years</Label>
        <Slider
          value={[formData.yearsActive]}
          onValueChange={(value) => updateFormData({ yearsActive: value[0] })}
          max={20}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 years</span>
          <span>20+ years</span>
        </div>
      </div>

      {/* Notable Achievements */}
      <div className="space-y-2">
        <Label htmlFor="achievements">Notable Achievements (Optional)</Label>
        <Textarea
          id="achievements"
          value={formData.achievements}
          onChange={(e) => updateFormData({ achievements: e.target.value })}
          placeholder="Share any awards, recognitions, viral content, or significant milestones..."
          className="glass min-h-[100px]"
        />
      </div>

      {/* Brand Collaborations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Brand Collaborations (Optional)</h3>
          <Button
            onClick={addCollaboration}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent"
          >
            <Plus className="w-4 h-4" />
            Add Collaboration
          </Button>
        </div>

        {formData.brandCollaborations.map((collab, index) => (
          <Card key={index} className="glass mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Collaboration #{index + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCollaboration(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand Name</Label>
                  <Input
                    value={collab.brandName}
                    onChange={(e) => updateCollaboration(index, { brandName: e.target.value })}
                    placeholder="Brand name"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Campaign Title</Label>
                  <Input
                    value={collab.campaignTitle}
                    onChange={(e) => updateCollaboration(index, { campaignTitle: e.target.value })}
                    placeholder="Campaign or project title"
                    className="glass"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    value={collab.year}
                    onChange={(e) => updateCollaboration(index, { year: e.target.value })}
                    placeholder="2024"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Collaboration Type</Label>
                  <Select value={collab.type} onValueChange={(value) => updateCollaboration(index, { type: value })}>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {collaborationTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={collab.description}
                  onChange={(e) => updateCollaboration(index, { description: e.target.value })}
                  placeholder="Brief description of the collaboration..."
                  className="glass"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
