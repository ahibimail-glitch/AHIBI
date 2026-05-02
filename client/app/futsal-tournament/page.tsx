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
import { Loader2, Plus, Trash2, Trophy, Calendar, MapPin, Users, IndianRupee, CheckCircle2 } from "lucide-react"
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

interface Player {
  fullName: string
  age: string
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
  const [players, setPlayers] = useState<Player[]>([
    { fullName: "", age: "", phone: "", idType: "", idNumber: "" }
  ])
  const [teamManager, setTeamManager] = useState<Contact>({ fullName: "", phone: "", email: "" })
  const [teamCoach, setTeamCoach] = useState<Contact>({ fullName: "", phone: "", email: "" })
  const [declarationsAccepted, setDeclarationsAccepted] = useState(false)

  const addPlayer = () => {
    if (players.length < MAX_PLAYERS) {
      setPlayers([...players, { fullName: "", age: "", phone: "", idType: "", idNumber: "" }])
    }
  }

  const removePlayer = (index: number) => {
    if (players.length > MIN_PLAYERS) {
      setPlayers(players.filter((_, i) => i !== index))
    }
  }

  const updatePlayer = (index: number, field: keyof Player, value: string) => {
    const updatedPlayers = [...players]
    updatedPlayers[index][field] = value
    setPlayers(updatedPlayers)
  }

  const validateForm = () => {
    if (!teamName.trim()) {
      toast.error("Team name is required")
      return false
    }

    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
      toast.error(`Team must have between ${MIN_PLAYERS} and ${MAX_PLAYERS} players`)
      return false
    }

    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      if (!player.fullName.trim()) {
        toast.error(`Player ${i + 1}: Full name is required`)
        return false
      }
      if (player.age && (parseInt(player.age) < 10 || parseInt(player.age) > 50)) {
        toast.error(`Player ${i + 1}: Age must be between 10 and 50`)
        return false
      }
      if (player.phone && !/^\d{10}$/.test(player.phone)) {
        toast.error(`Player ${i + 1}: Phone must be a 10-digit number`)
        return false
      }
      if (!player.idType) {
        toast.error(`Player ${i + 1}: ID type is required`)
        return false
      }
      if (!player.idNumber.trim()) {
        toast.error(`Player ${i + 1}: ID number is required`)
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
          name: players[0].fullName,
          contact: players[0].phone,
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
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-2xl">Team Registration</CardTitle>
              <CardDescription>
                Fill in your team details to register. Registration fee: <span className="font-bold text-green-600">₹{REGISTRATION_FEE.toLocaleString('en-IN')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

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

              {/* Players Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Players ({players.length}/{MAX_PLAYERS}) *</Label>
                  <Badge variant="outline">{MIN_PLAYERS}-{MAX_PLAYERS} players required</Badge>
                </div>

                {players.map((player, index) => (
                  <Card key={index} className="border-green-100">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Player {index + 1}</h4>
                        {players.length > MIN_PLAYERS && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePlayer(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Full Name *</Label>
                          <Input
                            placeholder="Player full name"
                            value={player.fullName}
                            onChange={(e) => updatePlayer(index, 'fullName', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Age (Optional)</Label>
                          <Input
                            type="number"
                            placeholder="Age (10-50)"
                            value={player.age}
                            onChange={(e) => updatePlayer(index, 'age', e.target.value)}
                            min="10"
                            max="50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone (Optional)</Label>
                          <Input
                            type="tel"
                            placeholder="10-digit phone number"
                            value={player.phone}
                            onChange={(e) => updatePlayer(index, 'phone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>ID Type *</Label>
                          <Select
                            value={player.idType}
                            onValueChange={(value) => updatePlayer(index, 'idType', value)}
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
                            onChange={(e) => updatePlayer(index, 'idNumber', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {players.length < MAX_PLAYERS && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPlayer}
                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Player
                  </Button>
                )}
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
                disabled={loading || paymentLoading}
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
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  )
}
