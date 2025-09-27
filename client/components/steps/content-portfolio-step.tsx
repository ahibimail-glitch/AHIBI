"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Plus, X, Upload, FileText, Eye, Heart, Share, MessageCircle, ExternalLink } from "lucide-react"
import type { FormData } from "../nis-registration-form"

interface ContentPortfolioStepProps {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  showErrors?: boolean
  onUploadStatusChange?: (isUploading: boolean) => void
}

const contentTypes = ["Video", "Image", "Carousel", "Story", "Reel", "Post", "Article", "Live Stream"]

const platforms = ["Instagram", "YouTube", "Facebook", "TikTok", "Twitter", "LinkedIn", "Other"]

export function ContentPortfolioStep({ formData, updateFormData, showErrors, onUploadStatusChange }: ContentPortfolioStepProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const addContent = () => {
    const newContent = {
      title: "",
      platform: "",
      url: "",
      type: "",
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
    }
    updateFormData({
      topContent: [...formData.topContent, newContent],
    })
  }

  const removeContent = (index: number) => {
    const newContent = formData.topContent.filter((_, i) => i !== index)
    updateFormData({ topContent: newContent })
  }

  const updateContent = (index: number, updates: any) => {
    const newContent = formData.topContent.map((content, i) => (i === index ? { ...content, ...updates } : content))
    updateFormData({ topContent: newContent })
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file only")
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB
      alert("File size must be less than 100MB")
      return
    }

    setIsUploading(true)
    onUploadStatusChange?.(true)

    // Upload to API
    try {
      setUploadError(null)
      setUploadProgress(10)

      const form = new FormData()
      form.append('document', file)
      form.append('folder', 'ahibi/nis-analytics')

      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: form,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to upload PDF')
      }

      const result = await response.json()
      const url: string | undefined = result?.data?.document?.url
      if (!url) {
        throw new Error('Upload succeeded but URL missing in response')
      }

      setUploadProgress(100)
      // Store URL; do not keep File in state to simplify submission
      updateFormData({ analyticsFile: undefined, analyticsFileUrl: url as any })
      setIsUploading(false)
      onUploadStatusChange?.(false)
    } catch (e: any) {
      setUploadProgress(0)
      setUploadError(e?.message || 'Upload failed')
      setIsUploading(false)
      onUploadStatusChange?.(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  return (
    <div className="space-y-6">
      {/* Top Performing Content */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Performing Content (Minimum 3 required)</h3>
          <Button onClick={addContent} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Plus className="w-4 h-4" />
            Add Content
          </Button>
        </div>

        {formData.topContent.length === 0 && (
          <Card className="glass border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No content added yet. Click "Add Content" to get started.</p>
              {showErrors && (
                <p className="text-sm text-destructive mt-2">Please add at least 3 top content entries.</p>
              )}
            </CardContent>
          </Card>
        )}

        {formData.topContent.map((content, index) => (
          <Card key={index} className="glass mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Content #{index + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContent(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Content Title *</Label>
                  <Input
                    value={content.title}
                    onChange={(e) => updateContent(index, { title: e.target.value })}
                    placeholder="Enter content title"
                    className={`glass ${showErrors && !content.title ? "border-destructive" : ""}`}
                  />
                  {showErrors && !content.title && (
                    <p className="text-xs text-destructive">Please enter a title.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Platform *</Label>
                  <Select value={content.platform} onValueChange={(value) => updateContent(index, { platform: value })}>
                    <SelectTrigger className={`glass ${showErrors && !content.platform ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showErrors && !content.platform && (
                    <p className="text-xs text-destructive">Please select a platform.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Content URL *
                    {content.url && (
                      <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </Label>
                  <Input
                    value={content.url}
                    onChange={(e) => updateContent(index, { url: e.target.value })}
                    placeholder="https://..."
                    className={`glass ${showErrors && !content.url ? "border-destructive" : ""}`}
                  />
                  {showErrors && !content.url && (
                    <p className="text-xs text-destructive">Please enter a content URL.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Content Type *</Label>
                  <Select value={content.type} onValueChange={(value) => updateContent(index, { type: value })}>
                    <SelectTrigger className={`glass ${showErrors && !content.type ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showErrors && !content.type && (
                    <p className="text-xs text-destructive">Please select a content type.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Views
                  </Label>
                  <Input
                    type="number"
                    value={content.views || ""}
                    onChange={(e) => updateContent(index, { views: Number.parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Likes
                  </Label>
                  <Input
                    type="number"
                    value={content.likes || ""}
                    onChange={(e) => updateContent(index, { likes: Number.parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Share className="w-4 h-4" />
                    Shares
                  </Label>
                  <Input
                    type="number"
                    value={content.shares || ""}
                    onChange={(e) => updateContent(index, { shares: Number.parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Comments
                  </Label>
                  <Input
                    type="number"
                    value={content.comments || ""}
                    onChange={(e) => updateContent(index, { comments: Number.parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="glass"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Upload */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Analytics Upload <span className="text-destructive">*</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">1-year analytics report required (PDF)</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? "border-primary bg-primary/10" 
                : showErrors && !formData.analyticsFile && !(formData as any).analyticsFileUrl 
                  ? "border-destructive" 
                  : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {formData.analyticsFile ? formData.analyticsFile.name : (formData as any).analyticsFileUrl ? 'PDF uploaded' : "Drop your analytics PDF here"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse files (Max 10MB)</p>
            {showErrors && !formData.analyticsFile && !(formData as any).analyticsFileUrl && (
              <p className="text-xs text-destructive mt-2">Analytics report is required</p>
            )}
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="analytics-upload"
            />
            <Button variant="outline" asChild>
              <label htmlFor="analytics-upload" className="cursor-pointer">
                Choose File
              </label>
            </Button>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* File Info */}
          {formData.analyticsFile && (
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{formData.analyticsFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(formData.analyticsFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateFormData({ analyticsFile: undefined })}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Uploaded URL Preview */}
          {!formData.analyticsFile && (formData as any).analyticsFileUrl && (
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Analytics PDF uploaded</p>
                  <a href={(formData as any).analyticsFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View</a>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateFormData({ analyticsFile: undefined, analyticsFileUrl: undefined as any })}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {uploadError && (
            <div className="text-sm text-red-600">{uploadError}</div>
          )}

          {/* Required Analytics Checklist */}
          <div className="space-y-2">
            <h4 className="font-medium">Required Analytics Data:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Reach & Impressions
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Engagement Rate
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Audience Demographics
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Performance Metrics
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
