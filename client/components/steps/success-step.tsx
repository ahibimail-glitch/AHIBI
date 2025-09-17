"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, Share2, Calendar, Mail } from "lucide-react"

export function SuccessStep() {
  const [registrationId, setRegistrationId] = useState("")
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem("nis-2025-registration-id") || "NIS2025-UNKNOWN"
    setRegistrationId(id)

    // Trigger animation after component mounts
    setTimeout(() => setShowAnimation(true), 100)
  }, [])

  const downloadPDF = () => {
    // In a real implementation, this would generate and download a PDF
    alert("PDF download functionality would be implemented here")
  }

  const shareRegistration = () => {
    if (navigator.share) {
      navigator.share({
        title: "NIS 2025 Registration Complete",
        text: `I've successfully registered for the Nagaland Influencers Summit 2025! Registration ID: ${registrationId}`,
        url: window.location.href,
      })
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(
        `I've successfully registered for the Nagaland Influencers Summit 2025! Registration ID: ${registrationId}`,
      )
      alert("Registration details copied to clipboard!")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="glass text-center">
        <CardHeader className="pb-6">
          <div
            className={`transition-all duration-1000 ${showAnimation ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Registration Successful!
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Thank you for registering for the Nagaland Influencers Summit 2025 Content Creator Awards!
            </p>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h3 className="font-semibold text-primary mb-2">Your Registration ID</h3>
              <div className="text-2xl font-mono font-bold text-primary">{registrationId}</div>
              <p className="text-xs text-muted-foreground mt-2">Please save this ID for your records</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What's Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">Email Confirmation</h4>
                  <p className="text-xs text-muted-foreground">You'll receive a confirmation email within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                <Calendar className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">Review Process</h4>
                  <p className="text-xs text-muted-foreground">Applications will be reviewed by our panel of judges</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={downloadPDF} variant="outline" className="flex items-center gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Download PDF Copy
            </Button>

            <Button onClick={shareRegistration} className="gradient-primary flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Registration
            </Button>
          </div>

          <div className="pt-6 border-t text-sm text-muted-foreground">
            <p>
              For any questions or support, please contact us at{" "}
              <a href="mailto:support@nis2025.com" className="text-primary hover:underline">
                support@nis2025.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
