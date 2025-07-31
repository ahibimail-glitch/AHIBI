"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Swal from "sweetalert2"

interface FormData {
  squadName: string;
  mainMembers: { ign: string; id: string }[];
  squadLeaderPhone: string;
  preferredContactMode: string;
  substitutes: { ign: string; id: string }[];
  mobileGamesInterested: string[];
  pcConsoleGamesInterested: string[];
  email: string;
}

export default function BGMIRegistration() {
  const [formData, setFormData] = useState<FormData>({
    squadName: "",
    mainMembers: Array(4).fill({ ign: "", id: "" }),
    squadLeaderPhone: "",
    preferredContactMode: "",
    substitutes: Array(3).fill({ ign: "", id: "" }),
    mobileGamesInterested: [],
    pcConsoleGamesInterested: [],
    email: ""
  })

  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [isLoggedIn] = useState(false) // Mock login state
  const [isRegistrationOpen] = useState(true) // Mock registration status

  // Progress calculation
  useEffect(() => {
    const requirements = [
      () => formData.squadName.trim() !== "",
      () => formData.mainMembers.filter(m => m.ign && m.id).length === 4,
      () => formData.squadLeaderPhone.trim() !== "",
      () => formData.preferredContactMode !== "",
      () => formData.email.trim() !== ""
    ]

    const completed = requirements.filter((req) => req()).length
    const percentage = Math.round((completed / requirements.length) * 100)
    setProgress(percentage)
  }, [formData])

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "squadName" || field === "squadLeaderPhone" || field === "preferredContactMode" || field === "email") {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleMemberChange = (index: number, field: 'ign' | 'id', value: string) => {
    setFormData(prev => {
      const updatedMembers = [...prev.mainMembers];
      updatedMembers[index] = { 
        ...updatedMembers[index], 
        [field]: value 
      };
      return { ...prev, mainMembers: updatedMembers };
    });
  }

  const handleSubstituteChange = (index: number, field: 'ign' | 'id', value: string) => {
    setFormData(prev => {
      const updatedSubs = [...prev.substitutes];
      updatedSubs[index] = { 
        ...updatedSubs[index], 
        [field]: value 
      };
      return { ...prev, substitutes: updatedSubs };
    });
  }

  const handleCheckboxChange = (field: "mobileGamesInterested" | "pcConsoleGamesInterested", value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked ? [...prev[field], value] : prev[field].filter((item) => item !== value),
    }))
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.squadName.trim()) errors.push("Squad name is required")
    
    // Check if all main members have both IGN and ID
    const validMainMembers = formData.mainMembers.filter(m => m.ign && m.id);
    if (validMainMembers.length !== 4) {
      errors.push("All 4 main members must have both IGN and ID")
    }
    
    if (!formData.squadLeaderPhone.trim()) errors.push("Leader phone is required")
    if (!/^[0-9]{10}$/.test(formData.squadLeaderPhone)) errors.push("Phone number must be 10 digits")
    if (!formData.preferredContactMode) errors.push("Preferred contact mode is required")
    if (!formData.email.trim()) errors.push("Email is required")
    
    // Only validate substitutes that have either IGN or ID filled
    const partialSubs = formData.substitutes.filter(s => s.ign || s.id);
    const invalidSubs = partialSubs.filter(s => !s.ign || !s.id);
    if (invalidSubs.length > 0) {
      errors.push("All substitutes must have both IGN and ID")
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isRegistrationOpen) {
      Swal.fire({
        icon: "info",
        title: "Registration Closed",
        text: "All slots are sold. Please check back later.",
        confirmButtonColor: "#facc15",
      })
      return
    }

    const validationErrors = validateForm()

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      Swal.fire({
        icon: "error",
        title: "Please fix the errors",
        text: "Some required fields are missing or invalid.",
        confirmButtonColor: "#14b8a6",
      })
      return
    }

    setErrors([])

    try {
      // Send data to backend API with direct URL to the backend server
      const response = await fetch('http://localhost:5000/api/events/bgmi/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      const result = await response.json();

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Your squad has been registered successfully!",
        confirmButtonColor: "#14b8a6",
        didOpen: () => {
          // Confetti animation
          const canvas = document.createElement("canvas")
          canvas.style.position = "fixed"
          canvas.style.inset = "0"
          canvas.style.pointerEvents = "none"
          canvas.style.zIndex = "9999"
          document.body.appendChild(canvas)

          const ctx = canvas.getContext("2d")!
          const updateSize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
          }
          updateSize()
          window.addEventListener("resize", updateSize)

          const particles: any[] = []
          for (let i = 0; i < 120; i++) {
            particles.push({
              x: Math.random() * canvas.width,
              y: -20 - Math.random() * canvas.height,
              vx: (Math.random() - 0.5) * 2,
              vy: 2 + Math.random() * 3,
              s: 4 + Math.random() * 4,
              r: Math.random() * Math.PI,
            })
          }

          let frame = 0
          const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach((p) => {
              p.x += p.vx
              p.y += p.vy
              p.r += 0.05
              ctx.save()
              ctx.translate(p.x, p.y)
              ctx.rotate(p.r)
              ctx.fillStyle = `hsl(${(p.y + p.x + frame) % 360}, 90%, 60%)`
              ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s)
              ctx.restore()
              if (p.y > canvas.height + 20) p.y = -20
            })
            frame++
            if (frame < 500) {
              requestAnimationFrame(animate)
            } else {
              try {
                if (canvas && canvas.parentNode) {
                  canvas.parentNode.removeChild(canvas)
                }
              } catch (err) {
                console.log('Error removing canvas:', err)
              }
            }
          }
          animate()
        },
      })

      // Reset form
      setFormData({
        squadName: "",
        mainMembers: Array(4).fill({ ign: "", id: "" }),
        squadLeaderPhone: "",
        preferredContactMode: "",
        substitutes: Array(3).fill({ ign: "", id: "" }),
        mobileGamesInterested: [],
        pcConsoleGamesInterested: [],
        email: ""
      })
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Something went wrong. Please try again.",
        confirmButtonColor: "#14b8a6",
      })
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-zinc-900 font-sans text-white"
      style={{
        backgroundImage: "url('/bgmi.jpg')",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="mx-auto max-w-3xl bg-black/50 rounded-2xl border border-yellow-600/30 shadow-lg shadow-yellow-500/20 backdrop-blur">
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr,auto] items-center gap-4 sm:gap-3 text-center sm:text-left">
              {/* Logo */}
              <div className="flex justify-center sm:justify-start items-center gap-2">
                <img
                  src="/nes-logo.png"
                  alt="Nagaland Esport Society"
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-contain ring-1 ring-white/15 shadow"
                />
              </div>

              {/* Title */}
              <h1 className="font-['Orbitron'] text-2xl text-center sm:text-3xl md:text-4xl font-black tracking-tight text-yellow-400 drop-shadow-md uppercase">
                NES BGMI OPEN 2025
              </h1>

              {/* Actions */}
              {/* <div className="flex justify-center sm:justify-end items-center flex-wrap gap-2">
                {isLoggedIn ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-white/90 bg-white/10 hover:bg-white/15 ring-1 ring-white/15 border-0"
                    >
                      My Submissions
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full text-white bg-gradient-to-r from-rose-500 to-red-500 hover:brightness-110 shadow ring-1 ring-white/10"
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline rounded-full px-2 py-1 text-xs font-medium text-yellow-300/90 ring-1 ring-yellow-300/30 bg-yellow-300/10">
                      Not logged in
                    </span>
                    <Button
                      size="sm"
                      className="rounded-full text-black bg-yellow-400 hover:bg-yellow-400 hover:brightness-110 shadow ring-1 ring-white/10"
                    >
                      Login
                    </Button>
                  </>
                )}
              </div> */}
            </div>
          </div>
        </div>

        {/* Mobile subline */}
        <div className="mt-2 text-center sm:hidden">
          <p className="text-white/60 text-xs">
            {isLoggedIn ? (
              <>
                •{" "}
                <a className="underline hover:text-teal-300" href="#">
                  My Submissions
                </a>
                •{" "}
                <a className="underline hover:text-red-400" href="#">
                  Logout
                </a>
              </>
            ) : (
              <>
                <span className="text-yellow-300 font-semibold">Not logged in</span>•{" "}
                <a className="underline hover:text-teal-300" href="#">
                  Login
                </a>
              </>
            )}
          </p>
        </div>
      </header>

      <main className="px-4 md:px-6 w-full md:max-w-3xl mx-auto space-y-6 md:space-y-8 pb-20 md:pb-8">
        {/* Progress Bar */}
        <div className="bg-white/6 backdrop-blur-[18px] border border-white/8 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Form completion</span>
            <span className="text-sm font-semibold text-yellow-400">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-white/6 backdrop-blur-[18px] border border-red-500/30 p-4 rounded-xl text-red-200">
            <ul className="list-disc pl-5 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/6 backdrop-blur-[18px] border border-white/8 p-4 md:p-6 rounded-2xl space-y-6 md:space-y-8 bg-black/40 border-yellow-400/20 shadow shadow-yellow-500/10"
        >
          {/* Squad Details */}
          <section className="space-y-3 md:space-y-4">
            <h2 className="font-['Orbitron'] text-xl md:text-2xl font-extrabold text-yellow-400 tracking-wide uppercase border-b border-yellow-500/20 pb-1">
              Squad Details
            </h2>

            <div>
              <Label className="block mb-2">Squad Name *</Label>
              <Input
                type="text"
                value={formData.squadName}
                onChange={(e) => handleInputChange("squadName", e.target.value)}
                className="w-full p-3 rounded bg-zinc-900/40 text-white placeholder:text-gray-400 border border-yellow-500/20 focus:ring-yellow-400 focus:ring-1 outline-none shadow-md"
                required
              />
            </div>

            <div className="space-y-4">
              <Label className="block mb-2">Main 4 Members (IGN + ID) *</Label>
              
              {[0, 1, 2, 3].map((index) => (
                <div key={`member-${index}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-white/70 mb-1 block">Member {index + 1} IGN</Label>
                    <Input
                      type="text"
                      value={formData.mainMembers[index]?.ign || ''}
                      onChange={(e) => handleMemberChange(index, 'ign', e.target.value)}
                      className="w-full p-2 rounded bg-zinc-900/40 text-white placeholder:text-gray-400 border border-yellow-500/20 focus:ring-yellow-400 focus:ring-1 outline-none shadow-md"
                      placeholder="In-Game Name"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/70 mb-1 block">Member {index + 1} ID</Label>
                    <Input
                      type="text"
                      value={formData.mainMembers[index]?.id || ''}
                      onChange={(e) => handleMemberChange(index, 'id', e.target.value)}
                      className="w-full p-2 rounded bg-zinc-900/40 text-white placeholder:text-gray-400 border border-yellow-500/20 focus:ring-yellow-400 focus:ring-1 outline-none shadow-md"
                      placeholder="In-Game ID"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Info */}
          <section className="space-y-3 md:space-y-4">
            <h2 className="font-['Orbitron'] text-xl md:text-2xl font-extrabold text-yellow-400 tracking-wide uppercase border-b border-yellow-500/20 pb-1">
              Contact Info
            </h2>

            <div>
              <Label className="block mb-2">Leader Phone (WhatsApp Preferred) *</Label>
              <Input
                type="tel"
                value={formData.squadLeaderPhone}
                onChange={(e) => handleInputChange("squadLeaderPhone", e.target.value)}
                className="w-full p-3 rounded bg-zinc-900/40 text-white placeholder:text-gray-400 border border-yellow-500/20 focus:ring-yellow-400 focus:ring-1 outline-none shadow-md"
                required
              />
            </div>

            <div>
              <Label className="block mb-2">Preferred Mode of Contact *</Label>
              <RadioGroup
                value={formData.preferredContactMode}
                onValueChange={(value) => handleInputChange("preferredContactMode", value)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="WhatsApp" id="whatsapp" className="accent-purple-500" />
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Email" id="email" className="accent-purple-500" />
                  <Label htmlFor="email">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Phone Call" id="phone" className="accent-purple-500" />
                  <Label htmlFor="phone">Phone Call</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="block mb-2">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full p-3 rounded bg-zinc-900/40 text-white placeholder:text-gray-400 border border-yellow-500/20 focus:ring-yellow-400 focus:ring-1 outline-none shadow-md"
                required
              />
            </div>
          </section>

          {/* Substitutes */}
          <section className="space-y-3 md:space-y-4">
            <h2 className="font-['Orbitron'] text-xl md:text-2xl font-extrabold text-yellow-400 tracking-wide uppercase border-b border-yellow-500/20 pb-1">
              Substitutes
            </h2>

            <div className="space-y-4">
              <Label className="block mb-2">Substitute IGN + ID (Up to 3 Substitutes Permitted)</Label>
              
              {[0, 1, 2].map((index) => (
                <div key={`sub-${index}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-white/70 mb-1 block">Substitute {index + 1} IGN</Label>
                    <Input
                      type="text"
                      value={formData.substitutes[index]?.ign || ''}
                      onChange={(e) => handleSubstituteChange(index, 'ign', e.target.value)}
                      className="w-full p-2 rounded bg-zinc-900/40 text-white placeholder:text-gray-400 border border-yellow-500/20 focus:ring-yellow-400 focus:ring-1 outline-none shadow-md"
                      placeholder="In-Game Name (optional)"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/70 mb-1 block">Substitute {index + 1} ID</Label>
                    <Input
                      type="text"
                      value={formData.substitutes[index]?.id || ''}
                      onChange={(e) => handleSubstituteChange(index, 'id', e.target.value)}
                      className="w-full p-2 rounded bg-zinc-900/40 text-white placeholder:text-gray-400 border border-yellow-500/20 focus:ring-yellow-400 focus:ring-1 outline-none shadow-md"
                      placeholder="In-Game ID (optional)"
                    />
                  </div>
                </div>
              ))}
              
              <span className="text-xs text-red-400 mt-1 block">
                ⚠️ Substitutes cannot play for other teams — instant disqualification.
              </span>
            </div>
          </section>

          {/* Game Preferences */}
          <section className="space-y-3 md:space-y-4">
            <h2 className="font-['Orbitron'] text-xl md:text-2xl font-extrabold text-yellow-400 tracking-wide uppercase border-b border-yellow-500/20 pb-1">
              Game Preferences
            </h2>

            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-2">Mobile Games</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[
                  "Clash of Clans",
                  "Mobile Legends: Bang Bang",
                  "BGMI (Battlegrounds Mobile India)",
                  "Call of Duty: Mobile",
                  "Honor of Kings"
                ].map(
                  (game) => (
                    <div key={game} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                      <Checkbox
                        id={`mobile-${game}`}
                        checked={formData.mobileGamesInterested.includes(game)}
                        onCheckedChange={(checked) => handleCheckboxChange("mobileGamesInterested", game, checked as boolean)}
                        className="accent-lime-500"
                      />
                      <Label htmlFor={`mobile-${game}`} className="text-sm">
                        {game}
                      </Label>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-2">Console & PC Games</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[
                  "FIFA / EA FC",
                  "Dota 2",
                  "Tekken",
                  "Counter-Strike 2 (CS2)",
                  "Valorant"
                ].map((game) => (
                  <div key={game} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                    <Checkbox
                      id={`console-${game}`}
                      checked={formData.pcConsoleGamesInterested.includes(game)}
                      onCheckedChange={(checked) => handleCheckboxChange("pcConsoleGamesInterested", game, checked as boolean)}
                      className="accent-yellow-500"
                    />
                    <Label htmlFor={`console-${game}`} className="text-sm">
                      {game}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Desktop Submit */}
          <Button
            type="submit"
            className="hidden md:block w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 hover:brightness-110 text-black font-semibold hover:scale-[1.01] transition"
            disabled={!isRegistrationOpen}
          >
            🚀 Submit Registration
          </Button>
        </form>
      </main>

      {/* Mobile Sticky Submit */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-slate-900/80 backdrop-blur border-t border-white/10">
        <Button
          type="submit"
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 hover:brightness-110 text-black font-semibold active:scale-[0.995] transition"
          disabled={!isRegistrationOpen}
        >
          🚀 Submit Registration
        </Button>
      </div>
    </div>
  )
}
