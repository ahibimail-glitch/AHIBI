"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import Swal from "sweetalert2"
import { uploadFile, createImagePreview, validateFile } from "@/lib/cloudinary"

interface RegistrationData {
  fullName: string;
  gender: string;
  phone: string;
  choice_of_controller: string;
  photo: File | null;
  photoUrl: string;
  photoPublicId?: string;
}

export default function FC25Registration() {
  const [formData, setFormData] = useState<RegistrationData>({
    fullName: "",
    gender: "",
    phone: "",
    choice_of_controller: "",
    photo: null,
    photoUrl: "",
  })

  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true)
  const [slots, setSlots] = useState<{ count: number; remaining: number; capacity: number; isOpen: boolean }>({ count: 0, remaining: 32, capacity: 32, isOpen: true })
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [uploading, setUploading] = useState<boolean>(false)

  // Progress calculation
  useEffect(() => {
    const requirements = [
      () => formData.fullName.trim() !== "",
      () => formData.gender.trim() !== "",
      () => formData.phone.trim() !== "",
      () => formData.choice_of_controller.trim() !== "",
      () => formData.photoUrl.trim() !== ""
    ]

    const completed = requirements.filter((req) => req()).length
    const percentage = Math.round((completed / requirements.length) * 100)
    setProgress(percentage)
  }, [formData])

  // Fetch slots on mount
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/FC25/slots`)
        if (res.ok) {
          const data = await res.json()
          // ApiResponse.success returns { success, message, data }
          const s = data?.data || data
          if (s) {
            setSlots({
              count: s.count ?? 0,
              remaining: s.remaining ?? Math.max(0, (s.capacity ?? 32) - (s.count ?? 0)),
              capacity: s.capacity ?? 32,
              isOpen: s.isOpen ?? ((s.count ?? 0) < (s.capacity ?? 32)),
            })
            setIsRegistrationOpen(s.isOpen ?? ((s.count ?? 0) < (s.capacity ?? 32)))
          }
        }
      } catch (e) {
        console.warn('Failed to fetch slots', e)
      }
    }
    fetchSlots()
  }, [])

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate using shared utility (allow up to 100MB as per UI note)
      const validationError = validateFile(file, 100 * 1024 * 1024)
      if (validationError) {
        Swal.fire({
          icon: "error",
          title: "Invalid file",
          text: validationError,
          confirmButtonColor: "#f59e0b",
        })
        return
      }

      try {
        setUploading(true)
        // Immediate local preview
        const localPreview = await createImagePreview(file)
        setPhotoPreview(localPreview)

        // Upload to Cloudinary via backend API
        const result = await uploadFile(file)
        if (
          result.status === 'success' &&
          result.data &&
          result.data.photo &&
          result.data.photo.url
        ) {
          const url = result.data.photo.url
          const publicId = result.data.photo.public_id
          setFormData(prev => ({
            ...prev,
            photo: file,
            photoUrl: url,
            photoPublicId: publicId,
          }))
          // Use Cloudinary URL for preview to avoid large data URLs
          setPhotoPreview(url)
        } else {
          throw new Error(result.message || 'Failed to upload photo')
        }
      } catch (err: any) {
        console.error('Photo upload error:', err)
        Swal.fire({
          icon: "error",
          title: "Upload failed",
          text: err?.message || 'Failed to upload photo',
          confirmButtonColor: "#f59e0b",
        })
      } finally {
        setUploading(false)
      }
    }
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.fullName.trim()) errors.push("Full name is required")
    if (!formData.gender.trim()) errors.push("Gender is required")
    if (!formData.phone.trim()) errors.push("Phone number is required")
    if (!/^[0-9]{10}$/.test(formData.phone)) errors.push("Phone number must be 10 digits")
    if (!formData.choice_of_controller.trim()) errors.push("Controller choice is required")
    if (!formData.photoUrl.trim()) errors.push("Passport photo is required")

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    // Re-check slots before proceeding
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/FC25/slots`)
      if (res.ok) {
        const data = await res.json()
        const s = data?.data || data
        if (s) {
          setSlots({
            count: s.count ?? 0,
            remaining: s.remaining ?? Math.max(0, (s.capacity ?? 32) - (s.count ?? 0)),
            capacity: s.capacity ?? 32,
            isOpen: s.isOpen ?? ((s.count ?? 0) < (s.capacity ?? 32)),
          })
          setIsRegistrationOpen(s.isOpen ?? ((s.count ?? 0) < (s.capacity ?? 32)))
        }
      }
    } catch {}

    if (!isRegistrationOpen) {
      Swal.fire({
        icon: "info",
        title: "Registration Closed",
        text: "All slots are filled. Please check back later.",
        confirmButtonColor: "#f59e0b",
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
        confirmButtonColor: "#f59e0b",
      })
      return
    }

    setErrors([])

    try {
      // Submit JSON with Cloudinary URL
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/FC25/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          gender: formData.gender,
          phone: formData.phone,
          choice_of_controller: formData.choice_of_controller,
          photo: formData.photoUrl,
          photoPublicId: formData.photoPublicId,
        }),
      })

      if (!response.ok) {
        let message = 'Registration failed'
        try {
          const errorData = await response.json()
          if (errorData?.message) message = errorData.message
        } catch {}
        throw new Error(message)
      }

      console.log('Form submission data:', {
        fullName: formData.fullName,
        gender: formData.gender,
        phone: formData.phone,
        choice_of_controller: formData.choice_of_controller,
        photo: formData.photoUrl,
      })

      Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        text: "Welcome to NUTMEG SHOWDOWN II! Check your email for further details.",
        confirmButtonColor: "#f59e0b",
        didOpen: () => {
          // Soccer ball animation
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
          for (let i = 0; i < 50; i++) {
            particles.push({
              x: Math.random() * canvas.width,
              y: -20 - Math.random() * canvas.height,
              vx: (Math.random() - 0.5) * 3,
              vy: 2 + Math.random() * 4,
              size: 8 + Math.random() * 12,
              rotation: Math.random() * Math.PI * 2,
            })
          }

          let frame = 0
          const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach((p) => {
              p.x += p.vx
              p.y += p.vy
              p.rotation += 0.1

              ctx.save()
              ctx.translate(p.x, p.y)
              ctx.rotate(p.rotation)

              // Draw soccer ball
              ctx.fillStyle = "white"
              ctx.beginPath()
              ctx.arc(0, 0, p.size, 0, Math.PI * 2)
              ctx.fill()

              ctx.strokeStyle = "black"
              ctx.lineWidth = 1
              ctx.stroke()

              // Add pentagon pattern
              ctx.strokeStyle = "black"
              ctx.lineWidth = 0.5
              for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(Math.cos(angle) * p.size * 0.3, Math.sin(angle) * p.size * 0.3)
                ctx.stroke()
              }

              ctx.restore()

              if (p.y > canvas.height + 50) p.y = -50
            })
            frame++
            if (frame < 300) {
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
        fullName: "",
        gender: "",
        phone: "",
        choice_of_controller: "",
        photo: null,
        photoUrl: "",
        photoPublicId: undefined,
      })
      setPhotoPreview("")
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: error?.message || "Something went wrong. Please try again.",
        confirmButtonColor: "#f59e0b",
      })
    }
  }

  return (
        <div
          className="min-h-screen bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 font-sans text-white"
          style={{
            backgroundImage: " url('/fifa.jpg')",
            backgroundSize: "cover",
            backgroundAttachment: "fixed",
            backgroundPosition: "center",
          }}
        >
          {/* Header */}
          <header className="px-4 pt-6 pb-4">
            <div className="mx-auto max-w-3xl bg-black/60 rounded-2xl border border-orange-400/30 shadow-2xl shadow-orange-500/20 backdrop-blur-md">
              <div className="p-6">
                <div className="text-center space-y-3">
                  {/* Logo */}
                  <div className="flex justify-center items-center gap-3 mb-4">

                    <img
                      src="/nes-logo.png"
                      alt="Nagaland Esport Society"
                      className="h-28 w-24 rounded-xl object-contain ring-2 ring-orange-400/30 shadow-lg"
                    />
                  </div>

                  {/* Title */}
                  <h1 className="font-['Orbitron'] text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 drop-shadow-lg uppercase">
                    NUTMEG SHOWDOWN II
                  </h1>

                  <p className="text-xl font-bold text-yellow-300 tracking-wide">
                    N.E.S FC25 Tournament
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-orange-200">
                    <span className="font-semibold">📅 August 13th, 2025</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="font-medium">📞 Contact: +917629857375</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 md:px-6 w-full md:max-w-3xl mx-auto space-y-6 md:space-y-8 pb-8 md:pb-8">
            {/* Tournament Info */}
            <div className="bg-gradient-to-r from-black/50 to-black/40 backdrop-blur-lg border border-orange-400/20 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold text-orange-400 mb-4 text-center">Tournament Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><span className="text-orange-300 font-semibold">Format:</span> Single Elimination</p>
                  <p><span className="text-orange-300 font-semibold">Finals:</span> Best of 3</p>
                </div>
                <div className="space-y-2">
                  <p><span className="text-orange-300 font-semibold">Slots:</span> {slots.remaining} of {slots.capacity} remaining</p>
                  <p><span className="text-orange-300 font-semibold">Entry:</span> Free</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-black/50 backdrop-blur-lg border border-orange-400/20 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-orange-200">Registration Progress</span>
                <span className="text-sm font-semibold text-orange-400">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-900/50 backdrop-blur-lg border border-red-500/50 p-4 rounded-xl text-red-200 shadow-lg">
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form */}
            <div className="bg-black/50 backdrop-blur-lg border border-orange-400/20 p-6 rounded-2xl space-y-8 shadow-2xl">
              {/* Personal Details */}
              <section className="space-y-6">
                <h2 className="font-['Orbitron'] text-2xl font-extrabold text-orange-400 tracking-wide uppercase border-b border-orange-500/20 pb-2">
                  Player Information
                </h2>

                <div>
                  <Label className="block mb-2 text-orange-200 font-medium">Full Name *</Label>
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-900/60 text-white placeholder:text-gray-400 border border-orange-400/30 focus:ring-orange-400 focus:ring-2 focus:border-orange-400 outline-none shadow-lg transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label className="block mb-3 text-orange-200 font-medium">Gender *</Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange("gender", value)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Male"
                        id="male"
                        className="border-orange-400 text-orange-400 focus:ring-orange-400"
                      />
                      <Label htmlFor="male" className="text-white">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Female"
                        id="female"
                        className="border-orange-400 text-orange-400 focus:ring-orange-400"
                      />
                      <Label htmlFor="female" className="text-white">Female</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="block mb-2 text-orange-200 font-medium">Working Phone Number *</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-900/60 text-white placeholder:text-gray-400 border border-orange-400/30 focus:ring-orange-400 focus:ring-2 focus:border-orange-400 outline-none shadow-lg transition-all"
                    placeholder="10-digit phone number"
                    required
                  />
                  <p className="text-xs text-orange-300 mt-1">
                    Please use number that has both incoming calls and WhatsApp or any miscommunication will not be our responsibility
                  </p>
                </div>

                <div>
                  <Label className="block mb-3 text-orange-200 font-medium">Choice of Controller *</Label>
                  <RadioGroup
                    value={formData.choice_of_controller}
                    onValueChange={(value) => handleInputChange("choice_of_controller", value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2 p-3 bg-gray-900/40 rounded-lg border border-orange-400/20">
                      <RadioGroupItem
                        value="PS5"
                        id="ps5"
                        className="border-orange-400 text-orange-400 focus:ring-orange-400"
                      />
                      <Label htmlFor="ps5" className="text-white font-medium">🎮 PlayStation 5 Controller</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-gray-900/40 rounded-lg border border-orange-400/20">
                      <RadioGroupItem
                        value="Xbox"
                        id="xbox"
                        className="border-orange-400 text-orange-400 focus:ring-orange-400"
                      />
                      <Label htmlFor="xbox" className="text-white font-medium">🎮 Xbox Controller</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-gray-900/40 rounded-lg border border-orange-400/20">
                      <RadioGroupItem
                        value="Keyboard"
                        id="keyboard"
                        className="border-orange-400 text-orange-400 focus:ring-orange-400"
                      />
                      <Label htmlFor="keyboard" className="text-white font-medium">⌨️ Keyboard & Mouse</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="block mb-2 text-orange-200 font-medium">Passport Photo *</Label>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="photo-upload"
                        disabled={uploading}
                        required
                      />
                      <label
                        htmlFor="photo-upload"
                        className={`flex items-center justify-center w-full p-6 border-2 border-dashed border-orange-400/50 rounded-lg bg-gray-900/40 transition-all group ${uploading ? 'opacity-80 cursor-not-allowed' : 'hover:bg-gray-900/60 cursor-pointer'}`}
                      >
                        <div className="text-center">
                          {uploading ? (
                            <div className="mx-auto h-8 w-8 mb-2 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload className="mx-auto h-8 w-8 text-orange-400 group-hover:text-orange-300 mb-2" />
                          )}
                          <span className="text-orange-200 font-medium">{uploading ? 'Uploading...' : 'Click to upload photo'}</span>
                          <p className="text-xs text-gray-400 mt-1">Max 100MB • PNG, JPG, JPEG</p>
                        </div>
                      </label>
                    </div>

                    {photoPreview && (
                      <div className="flex justify-center">
                        <div className="relative">
                          <img
                            src={photoPreview}
                            alt="Photo preview"
                            className="w-24 h-24 object-cover rounded-lg border-2 border-orange-400/50"
                          />
                          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            ✓
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-orange-300">
                      📸 Front-facing photo up to chest on white background. Transparent PNG preferred.
                    </p>
                  </div>
                </div>
              </section>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-bold text-lg hover:scale-[1.02] transition-all shadow-xl disabled:opacity-50"
                disabled={!isRegistrationOpen || progress < 100}
                onClick={handleSubmit}
              >
                ⚽ Join NUTMEG SHOWDOWN II
              </Button>
            </div>
          </main>

          {/* Mobile Sticky Submit */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-black/80 backdrop-blur-md border-t border-orange-400/20">
            <Button
              type="submit"
              onClick={handleSubmit}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-bold text-lg active:scale-[0.98] transition-all shadow-xl disabled:opacity-50"
              disabled={!isRegistrationOpen || progress < 100}
            >
              ⚽ Join NUTMEG SHOWDOWN II
            </Button>
          </div>
        </div>
      )
    }