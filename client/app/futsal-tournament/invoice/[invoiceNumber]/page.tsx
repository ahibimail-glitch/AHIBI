"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, ArrowLeft, Calendar, MapPin, Users, Trophy, IndianRupee, FileText, User, Phone, Mail, CheckCircle2 } from "lucide-react"

interface RegistrationData {
  id: string
  tournamentName: string
  teamName: string
  registrationNumber: string
  invoiceNumber: string
  paymentStatus: string
  amount: number
  currency: string
  player: {
    fullName: string
    phone?: string
    idType: string
    idNumber: string
  }
  numberOfPlayers: number
  players?: string[]
  teamManager?: {
    fullName?: string
    phone?: string
    email?: string
  }
  teamCoach?: {
    fullName?: string
    phone?: string
    email?: string
  }
  tournamentDetails: {
    dates: string
    venue: string
    format: string
    prizePool: string
  }
  registrationDate: string
  razorpayPaymentId?: string
  razorpayOrderId?: string
}

const idTypeLabels: Record<string, string> = {
  aadhar: 'Aadhar Card',
  pan: 'PAN Card',
  voter_id: 'Voter ID',
}

export default function FutsalTournamentInvoice() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<RegistrationData | null>(null)

  useEffect(() => {
    fetchRegistration()
  }, [params.invoiceNumber])

  const fetchRegistration = async () => {
    setLoading(true)
    setError(null)
    try {
      // Try admin endpoint first if we have token
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      
      if (token) {
        const adminResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/futsal/tournaments/registrations?search=${params.invoiceNumber}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (adminResponse.ok) {
          const adminData = await adminResponse.json()
          if (adminData.success && adminData.data.registrations) {
            const found = adminData.data.registrations.find((r: any) => r.invoiceNumber === params.invoiceNumber)
            if (found) {
              // Handle both old and new data structures
              const normalizedRegistration = normalizeRegistrationData(found)
              setRegistration(normalizedRegistration)
              return
            }
          }
        }
      }

      // If admin endpoint fails or no token, try the new endpoint
      const regResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/futsal/tournaments/registration/by-invoice/${params.invoiceNumber}`
      )

      if (regResponse.ok) {
        const data = await regResponse.json()
        if (data.success && data.data.registration) {
          // Handle both old and new data structures
          const normalizedRegistration = normalizeRegistrationData(data.data.registration)
          setRegistration(normalizedRegistration)
          return
        }
      }

      // If registration fetch fails, try to download invoice to verify it exists
      const invoiceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/futsal/tournaments/invoice/${params.invoiceNumber}`
      )

      if (!invoiceResponse.ok) {
        throw new Error('Invoice not found or payment not confirmed')
      }

      const blob = await invoiceResponse.blob()
      
      // If we get a PDF, the invoice exists but we couldn't fetch registration details
      if (blob.type === 'application/pdf') {
        // Show a message that registration details are not available but invoice can be downloaded
        setRegistration({
          id: '',
          tournamentName: 'Turf Titans Tournament T3',
          teamName: 'Registration Details Not Available',
          registrationNumber: 'N/A',
          invoiceNumber: params.invoiceNumber as string,
          paymentStatus: 'confirmed',
          amount: 3500,
          currency: 'INR',
          player: {
            fullName: '',
            phone: '',
            idType: 'aadhar',
            idNumber: '',
          },
          numberOfPlayers: 1,
          tournamentDetails: {
            dates: '21-23 May 2026',
            venue: 'Kuda Futsal Arena, Dimapur, Nagaland',
            format: '6v6 (Direct Knockout)',
            prizePool: '₹2,00,000',
          },
          registrationDate: new Date().toISOString(),
        })
      } else {
        throw new Error('Failed to fetch invoice')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to normalize registration data (handle both old and new structures)
  const normalizeRegistrationData = (data: any) => {
    // If data has the old players array (array of objects), convert it to new structure
    if (data.players && Array.isArray(data.players) && data.players.length > 0 && typeof data.players[0] === 'object' && data.players[0].fullName) {
      const firstPlayer = data.players[0]
      return {
        ...data,
        player: {
          fullName: firstPlayer.fullName || '',
          phone: firstPlayer.phone || '',
          idType: firstPlayer.idType || 'aadhar',
          idNumber: firstPlayer.idNumber || '',
        },
        numberOfPlayers: data.numberOfPlayers || data.players.length || 1,
      }
    }

    // If data already has the new structure (player object + players array of strings), return as-is
    return {
      ...data,
      player: data.player || {
        fullName: '',
        phone: '',
        idType: 'aadhar',
        idNumber: '',
      },
      numberOfPlayers: data.numberOfPlayers || 1,
    }
  }

  const downloadInvoice = async () => {
    setDownloading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/futsal/tournaments/invoice/${params.invoiceNumber}`
      )

      if (!response.ok) {
        throw new Error('Failed to download invoice')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${params.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || 'Failed to download invoice')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error || 'Invoice not found'}</AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/futsal-tournament')}
              className="w-full mt-4"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => router.push('/futsal-tournament')}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={downloadInvoice}
            disabled={downloading}
            className="bg-green-600 hover:bg-green-700"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>

        {/* Invoice Card */}
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-green-800">Tournament Invoice</CardTitle>
                <CardDescription className="text-base mt-1">
                  {registration.tournamentName}
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-lg font-semibold px-4 py-2 border-green-300">
                  {registration.invoiceNumber}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Registration Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 rounded-lg p-4">
              <div>
                <p className="text-sm text-gray-600">Registration Number</p>
                <p className="font-semibold text-lg">{registration.registrationNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <Badge className="bg-green-600">Confirmed</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Registration Date</p>
                <p className="font-semibold">
                  {new Date(registration.registrationDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="font-semibold text-2xl text-green-700">
                  ₹{registration.amount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Tournament Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-600" />
                Tournament Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Dates</p>
                    <p className="font-semibold">{registration.tournamentDetails.dates}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Venue</p>
                    <p className="font-semibold text-sm">{registration.tournamentDetails.venue}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                  <Users className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Format</p>
                    <p className="font-semibold">{registration.tournamentDetails.format}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                  <IndianRupee className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Prize Pool</p>
                    <p className="font-semibold">{registration.tournamentDetails.prizePool}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Prize Distribution */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                Prize Distribution
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="font-semibold text-amber-800">Winner</p>
                  <p className="text-xl font-bold text-amber-600">₹1,00,000</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="font-semibold text-amber-800">Runners Up</p>
                  <p className="text-xl font-bold text-amber-600">₹60,000</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="font-semibold text-amber-800">Semi Finalists</p>
                  <p className="text-xl font-bold text-amber-600">₹15,000 each</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="font-semibold text-amber-800">Top Scorer</p>
                  <p className="text-xl font-bold text-amber-600">₹5,000</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="font-semibold text-amber-800">Best Keeper</p>
                  <p className="text-xl font-bold text-amber-600">₹5,000</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Team Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Team Details
              </h3>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Team Name</p>
                  <p className="font-semibold text-xl">{registration.teamName}</p>
                </div>
                
                {registration.teamManager?.fullName && (
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <span className="font-semibold">Manager:</span> {registration.teamManager.fullName}
                      {registration.teamManager.phone && (
                        <span className="ml-2 text-gray-600">({registration.teamManager.phone})</span>
                      )}
                    </span>
                  </div>
                )}
                
                {registration.teamCoach?.fullName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <span className="font-semibold">Coach:</span> {registration.teamCoach.fullName}
                      {registration.teamCoach.phone && (
                        <span className="ml-2 text-gray-600">({registration.teamCoach.phone})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Team Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Team Details
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Number of Players:</span> {registration.numberOfPlayers || 1}
                  </div>
                  <div>
                    <span className="font-semibold">Team Name:</span> {registration.teamName || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Captain/Representative Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" />
                Captain/Representative Details
              </h3>
              <Card className="border-green-100">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Team Captain/Representative</h4>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{registration.player?.fullName || 'N/A'}</span>
                  </div>
                  {registration.player?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{registration.player.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-xs">
                      {registration.player ? `${idTypeLabels[registration.player.idType] || registration.player.idType}: ${registration.player.idNumber}` : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* All Players Names */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                All Team Players
              </h3>
              <Card className="border-green-100">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Player Names ({registration.numberOfPlayers || 0})</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {registration.players && registration.players.length > 0 ? (
                      registration.players.map((playerName: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-green-600">{index + 1}.</span>
                          <span>{playerName || 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 col-span-2">No player names available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-green-600" />
                Payment Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Razorpay Payment ID</span>
                  <span className="font-mono text-sm">{registration.razorpayPaymentId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Razorpay Order ID</span>
                  <span className="font-mono text-sm">{registration.razorpayOrderId || 'N/A'}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Footer Note */}
            <div className="text-center text-sm text-gray-500 space-y-1">
              <p>This is a computer-generated invoice. No signature is required.</p>
              <p>For queries, contact: Kuda Futsal Arena, Dimapur, Nagaland</p>
            </div>

            {/* Download Button */}
            <Button
              onClick={downloadInvoice}
              disabled={downloading}
              className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
              size="lg"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Downloading PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Invoice PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
