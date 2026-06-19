"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, Trash2, Trophy, Calendar, MapPin, Users, IndianRupee, CheckCircle2, Minus } from "lucide-react"
import { toast } from "sonner"
import Footer from "../Footer"
import Navbar from "../Navbar"

declare global {
  interface Window {
    Razorpay: any
  }
}

const REGISTRATION_FEE = 3500
const MIN_PLAYERS = 6
const MAX_PLAYERS = 10
const REGISTRATION_OPEN = false

interface Player {
  fullName: string
  phone: string
  idType: string
  idNumber: string
}

interface Contact {
  fullName: string
  phone: string
  email: string
}

export default function FutsalTournamentRegistration() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [registrationData, setRegistrationData] = useState<any>(null)

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existingScript) {
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  const [teamName, setTeamName] = useState("")
  const [numberOfPlayers, setNumberOfPlayers] = useState(6)
  const [player, setPlayer] = useState<Player>({
    fullName: "",
    phone: "",
    idType: "",
    idNumber: ""
  })
  const [players, setPlayers] = useState<string[]>(Array(6).fill(""))
  const [teamManager, setTeamManager] = useState<Contact>({ fullName: "", phone: "", email: "" })
  const [teamCoach, setTeamCoach] = useState<Contact>({ fullName: "", phone: "", email: "" })
  const [declarationsAccepted, setDeclarationsAccepted] = useState(false)

  const updatePlayer = (field: keyof Player, value: string) => {
    setPlayer(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updatePlayerName = (index: number, value: string) => {
    setPlayers(prev => {
      const newPlayers = [...prev]
      newPlayers[index] = value
      return newPlayers
    })
  }

  const handleNumberOfPlayersChange = (value: number) => {
    setNumberOfPlayers(value)
    setPlayers(prev => {
      const newPlayers = [...prev]
      if (value > prev.length) {
        // Add empty slots
        for (let i = prev.length; i < value; i++) {
          newPlayers.push("")
        }
      } else if (value < prev.length) {
        // Remove extra slots
        newPlayers.length = value
      }
      return newPlayers
    })
  }

  const validateForm = () => {
    if (!teamName.trim()) {
      toast.error("Team name is required")
      return false
    }

    if (numberOfPlayers < MIN_PLAYERS || numberOfPlayers > MAX_PLAYERS) {
      toast.error(`Number of players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`)
      return false
    }

    if (!player.fullName.trim()) {
      toast.error("Player full name is required")
      return false
    }
    if (player.phone && !/^\d{10}$/.test(player.phone)) {
      toast.error("Player phone must be a 10-digit number")
      return false
    }
    if (!player.idType) {
      toast.error("Player ID type is required")
      return false
    }
    if (!player.idNumber.trim()) {
      toast.error("Player ID number is required")
      return false
    }

    // Validate all player names
    for (let i = 0; i < players.length; i++) {
      if (!players[i].trim()) {
        toast.error(`Player ${i + 1} name is required`)
        return false
      }
    }

    if (teamManager.fullName && !/^\d{10}$/.test(teamManager.phone)) {
      toast.error("Team Manager: Phone must be a 10-digit number")
      return false
    }

    if (teamCoach.fullName && !/^\d{10}$/.test(teamCoach.phone)) {
      toast.error("Team Coach: Phone must be a 10-digit number")
      return false
    }

    if (!declarationsAccepted) {
      toast.error("You must accept the declarations to proceed")
      return false
    }

    return true
  }

  const handleRegistration = async () => {
    if (!REGISTRATION_OPEN) {
      toast.error("Registrations are closed.")
      return
    }

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/futsal/tournaments/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamName,
          numberOfPlayers,
          player,
          players,
          teamManager: teamManager.fullName ? teamManager : undefined,
          teamCoach: teamCoach.fullName ? teamCoach : undefined,
          declarationsAccepted,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      setRegistrationData(data.data)
      await initiatePayment(data.data.orderId, data.data.registrationId)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create registration')
    } finally {
      setLoading(false)
    }
  }

  const initiatePayment = async (orderId: string, registrationId: string) => {
    setPaymentLoading(true)
    try {
      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK not loaded')
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: REGISTRATION_FEE * 100,
        currency: 'INR',
        name: 'Turf Titans Tournament T3',
        description: 'Team Registration Fee',
        order_id: orderId,
        handler: async (response: any) => {
          await verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, registrationId)
        },
        prefill: {
          name: player.fullName,
          contact: player.phone,
        },
        theme: {
          color: '#15803D',
        },
      }

      const paymentObject = new (window as any).Razorpay(options)
      paymentObject.open()
      paymentObject.on('payment.failed', (response: any) => {
        toast.error('Payment failed. Please try again.')
        setPaymentLoading(false)
      })
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed')
      setPaymentLoading(false)
    }
  }

  const verifyPayment = async (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string, registrationId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/futsal/tournaments/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          registrationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Payment verification failed')
      }

      setSuccess(true)
      setRegistrationData(data.data.registration)
      setPaymentLoading(false)
      toast.success('Registration successful!')
    } catch (err: any) {
      toast.error(err.message || 'Payment verification failed')
      setPaymentLoading(false)
    }
  }

  if (success && registrationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-3xl text-green-800">Registration Successful!</CardTitle>
              <CardDescription className="text-lg">
                Your team has been registered for Turf Titans Tournament T3
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Registration Number:</span>
                  <Badge variant="outline" className="text-lg font-semibold px-4 py-1">
                    {registrationData.registrationNumber}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Team Name:</span>
                  <span className="font-semibold">{registrationData.teamName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge className="bg-green-600">Confirmed</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold text-lg">₹{registrationData.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Tournament Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>21-23 May 2026</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>Kuda Futsal Arena, Dimapur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>6v6 (Direct Knockout)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gray-500" />
                    <span>Prize Pool: ₹2,00,000</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => router.push(`/futsal-tournament/invoice/${registrationData.invoiceNumber}`)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <IndianRupee className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>

      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Tournament Info Banner */}
          <Card className="mb-8 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="text-3xl text-green-800">Turf Titans Tournament T3</CardTitle>
              <CardDescription className="text-base">
                Register your team for the most exciting futsal tournament in Nagaland!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Dates</p>
                    <p className="font-semibold text-sm">21-23 May 2026</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Venue</p>
                    <p className="font-semibold text-sm">Kuda Futsal Arena</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Format</p>
                    <p className="font-semibold text-sm">6v6 Knockout</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Prize Pool</p>
                    <p className="font-semibold text-sm">₹2,00,000</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prize Distribution */}
          <Card className="mb-8 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl text-amber-800">Prize Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="font-semibold text-amber-800">Winner</p>
                  <p className="text-2xl font-bold text-amber-600">₹1,00,000</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="font-semibold text-amber-800">Runners Up</p>
                  <p className="text-2xl font-bold text-amber-600">₹60,000</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="font-semibold text-amber-800">Semi Finalists</p>
                  <p className="text-2xl font-bold text-amber-600">₹15,000 each</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="font-semibold text-amber-800">Top Scorer</p>
                  <p className="text-2xl font-bold text-amber-600">₹5,000</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="font-semibold text-amber-800">Best Keeper</p>
                  <p className="text-2xl font-bold text-amber-600">₹5,000</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card className="border-green-200 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-2xl">Team Registration</CardTitle>
              <CardDescription>
                Fill in your team details to register. Registration fee: <span className="font-bold text-green-600">₹{REGISTRATION_FEE.toLocaleString('en-IN')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-6">
              {!REGISTRATION_OPEN && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-2xl">
                    <Badge className="mb-4 bg-red-600 hover:bg-red-600">Registration Closed</Badge>
                    <h3 className="text-2xl font-bold text-red-700">Registrations Are Now Closed</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Turf Titans Tournament T3 registration window has ended. Thank you to all teams for the overwhelming response.
                    </p>
                    <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      Tournament Dates: 21-23 May 2026
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Button
                        onClick={() => router.push("/")}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Go to Home
                      </Button>
                      {/* <Button
                        onClick={() => router.push("/sports/tournaments")}
                        variant="outline"
                        className="flex-1"
                      >
                        View Other Tournaments
                      </Button> */}
                    </div>
                  </div>
                </div>
              )}
              <div className={!REGISTRATION_OPEN ? "pointer-events-none select-none opacity-30 blur-[1px]" : ""}>

              {/* Team Name */}
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  placeholder="Enter your team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="text-lg"
                />
              </div>

              <Separator />

              {/* Number of Players */}
              <div className="space-y-2">
                <Label htmlFor="numberOfPlayers">Number of Players in Team *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleNumberOfPlayersChange(Math.max(MIN_PLAYERS, numberOfPlayers - 1))}
                    disabled={numberOfPlayers <= MIN_PLAYERS}
                    className="h-12 w-12"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="numberOfPlayers"
                    type="number"
                    placeholder="Enter number of players (1-10)"
                    value={numberOfPlayers}
                    onChange={(e) => handleNumberOfPlayersChange(parseInt(e.target.value) || 6)}
                    min={MIN_PLAYERS}
                    max={MAX_PLAYERS}
                    className="text-lg text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleNumberOfPlayersChange(Math.min(MAX_PLAYERS, numberOfPlayers + 1))}
                    disabled={numberOfPlayers >= MAX_PLAYERS}
                    className="h-12 w-12"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Enter the total number of players in your team </p>
              </div>

              <Separator />

              {/* Player Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Captain/Representative Details *</Label>
                  
                </div>

                <Card className="border-green-100">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Team Captain/Representative</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          placeholder="Captain full name"
                          value={player.fullName}
                          onChange={(e) => updatePlayer('fullName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone (Optional)</Label>
                        <Input
                          type="tel"
                          placeholder="10-digit phone number"
                          value={player.phone}
                          onChange={(e) => updatePlayer('phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ID Type *</Label>
                        <Select
                          value={player.idType}
                          onValueChange={(value) => updatePlayer('idType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ID type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aadhar">Aadhar Card</SelectItem>
                            <SelectItem value="pan">PAN Card</SelectItem>
                            <SelectItem value="voter_id">Voter ID</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ID Number *</Label>
                        <Input
                          placeholder="Enter ID number"
                          value={player.idNumber}
                          onChange={(e) => updatePlayer('idNumber', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* All Players Names Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">All Team Players Names *</Label>
                  <Badge variant="outline">{numberOfPlayers} Players</Badge>
                </div>

                <Card className="border-green-100">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Player Names (6-10)</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {players.map((playerName, index) => (
                        <div key={index} className="space-y-2">
                          <Label>Player {index + 1} Name *</Label>
                          <Input
                            placeholder={`Player ${index + 1} full name`}
                            value={playerName}
                            onChange={(e) => updatePlayerName(index, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Team Manager */}
              <div className="space-y-4">
                <Label className="text-lg">Team Manager (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Manager name"
                      value={teamManager.fullName}
                      onChange={(e) => setTeamManager({ ...teamManager, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="10-digit phone"
                      value={teamManager.phone}
                      onChange={(e) => setTeamManager({ ...teamManager, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={teamManager.email}
                      onChange={(e) => setTeamManager({ ...teamManager, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Team Coach */}
              <div className="space-y-4">
                <Label className="text-lg">Team Coach (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Coach name"
                      value={teamCoach.fullName}
                      onChange={(e) => setTeamCoach({ ...teamCoach, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="10-digit phone"
                      value={teamCoach.phone}
                      onChange={(e) => setTeamCoach({ ...teamCoach, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={teamCoach.email}
                      onChange={(e) => setTeamCoach({ ...teamCoach, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Declarations */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="declarations"
                    checked={declarationsAccepted}
                    onCheckedChange={(checked) => setDeclarationsAccepted(checked as boolean)}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="declarations" className="cursor-pointer">
                      I accept the terms and declarations *
                    </Label>
                    <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-4 rounded-lg">
                      <p>• All player information provided is accurate and verified</p>
                      <p>• All players are between 10-50 years of age</p>
                      <p>• Team agrees to follow all tournament rules and regulations</p>
                      <p>• Team agrees to fair play and sportsmanship</p>
                      <p>• Registration fee is non-refundable unless tournament is cancelled</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleRegistration}
                disabled={!REGISTRATION_OPEN || loading || paymentLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Registration...
                  </>
                ) : paymentLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>

                    Pay ₹{REGISTRATION_FEE.toLocaleString('en-IN')} & Register
                  </>
                )}
              </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  )
}
