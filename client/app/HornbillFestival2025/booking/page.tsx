"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Ticket, User, CreditCard, CheckCircle } from "lucide-react";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Suspense, useState, useEffect } from "react";
import { toast } from "sonner";

const BookingInner = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [bookingDetails, setBookingDetails] = useState<{
    type: string;
    category: string;
    price: string;
    day?: string;
    ticketType?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    quantity: 1,
  });

  const [step, setStep] = useState(1);

  useEffect(() => {
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const price = searchParams.get("price");
    const day = searchParams.get("day");
    const ticketType = searchParams.get("ticketType");

    if (!type || !category || !price) {
      router.push("/HornbillFestival2025");
      return;
    }

    setBookingDetails({
      type,
      category,
      price,
      day: day || undefined,
      ticketType: ticketType || undefined,
    });
  }, [searchParams, router]);

  if (!bookingDetails) {
    return null;
  }

  const pricePerTicket = parseInt(bookingDetails.price.replace("₹", "").replace(",", ""));
  const totalAmount = pricePerTicket * formData.quantity;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleContinue = () => {
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setStep(2);
  };

  const handlePayment = () => {
    toast.success("Payment processed successfully! Confirmation sent to your email.");
    setTimeout(() => router.push("/HornbillFestival2025"), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 pb-20">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8 hover:bg-muted rounded-xl"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="gradient-card rounded-2xl p-8 shadow-card border border-border/30"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                    step >= 1 ? "gradient-hero" : "bg-muted"
                  }`}>
                    1
                  </div>
                  <div className="flex-1 h-1 bg-muted rounded">
                    <div className={`h-full gradient-hero rounded transition-all duration-500 ${
                      step >= 2 ? "w-full" : "w-0"
                    }`} />
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                    step >= 2 ? "gradient-hero" : "bg-muted"
                  }`}>
                    2
                  </div>
                </div>

                {step === 1 ? (
                  <>
                    <h2 className="text-3xl font-bold mb-6 text-foreground flex items-center gap-3">
                      <User className="w-8 h-8 text-primary" />
                      Your Details
                    </h2>

                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="fullName" className="text-base font-semibold mb-2 block">
                          Full Name *
                        </Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          className="h-12 rounded-xl border-border/50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-base font-semibold mb-2 block">
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="your@email.com"
                          className="h-12 rounded-xl border-border/50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-base font-semibold mb-2 block">
                          Phone Number *
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="10-digit mobile number"
                          className="h-12 rounded-xl border-border/50"
                          maxLength={10}
                        />
                      </div>

                      <div>
                        <Label htmlFor="quantity" className="text-base font-semibold mb-2 block">
                          Number of Tickets
                        </Label>
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          min="1"
                          max="10"
                          value={formData.quantity}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl border-border/50"
                        />
                      </div>

                      <Button
                        onClick={handleContinue}
                        className="w-full gradient-hero text-white py-6 text-lg font-bold rounded-xl shadow-glow hover:shadow-premium transition-all duration-300"
                      >
                        Continue to Payment →
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold mb-6 text-foreground flex items-center gap-3">
                      <CreditCard className="w-8 h-8 text-primary" />
                      Payment Details
                    </h2>

                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 border border-primary/20">
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="w-6 h-6 text-accent" />
                          <p className="text-foreground font-semibold">Your booking is almost complete!</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Click "Complete Payment" to confirm your booking. You'll receive a confirmation email with your tickets.
                        </p>
                      </div>

                      <div className="border border-border/50 rounded-xl p-6 space-y-4">
                        <h3 className="font-bold text-lg text-foreground mb-4">Booking Summary</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-semibold text-foreground">{formData.fullName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-semibold text-foreground">{formData.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-semibold text-foreground">{formData.phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tickets:</span>
                            <span className="font-semibold text-foreground">{formData.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button
                          onClick={() => setStep(1)}
                          variant="outline"
                          className="flex-1 py-6 text-base font-semibold rounded-xl border-border/50"
                        >
                          ← Back
                        </Button>
                        <Button
                          onClick={handlePayment}
                          className="flex-1 gradient-hero text-white py-6 text-base font-bold rounded-xl shadow-glow hover:shadow-premium transition-all duration-300"
                        >
                          Complete Payment
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="gradient-card rounded-2xl p-6 shadow-card border border-border/30 sticky top-24"
              >
                <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                  <Ticket className="w-6 h-6 text-primary" />
                  Order Summary
                </h3>

                <div className="space-y-4 mb-6">
                  <div className="pb-4 border-b border-border/30">
                    <p className="text-sm text-muted-foreground mb-1">Event</p>
                    <p className="font-bold text-lg text-foreground">{bookingDetails.type}</p>
                  </div>

                  <div className="pb-4 border-b border-border/30">
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <p className="font-semibold text-foreground">{bookingDetails.category}</p>
                  </div>

                  {bookingDetails.day && (
                    <div className="pb-4 border-b border-border/30">
                      <p className="text-sm text-muted-foreground mb-1">Day</p>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Day {bookingDetails.day}
                      </p>
                    </div>
                  )}

                  {bookingDetails.ticketType && (
                    <div className="pb-4 border-b border-border/30">
                      <p className="text-sm text-muted-foreground mb-1">Ticket Type</p>
                      <p className="font-semibold text-foreground">{bookingDetails.ticketType}</p>
                    </div>
                  )}

                  <div className="pb-4 border-b border-border/30">
                    <p className="text-sm text-muted-foreground mb-1">Price per ticket</p>
                    <p className="font-bold text-2xl text-primary">{bookingDetails.price}</p>
                  </div>

                  <div className="pb-4 border-b border-border/30">
                    <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                    <p className="font-semibold text-foreground">× {formData.quantity}</p>
                  </div>
                </div>

                <div className="gradient-premium rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-foreground">Total Amount</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      ₹{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>Instant confirmation via email</span>
                  </p>
                  <p className="flex items-start gap-2 mt-2">
                    <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>Mobile tickets for easy entry</span>
                  </p>
                  <p className="flex items-start gap-2 mt-2">
                    <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>24/7 customer support</span>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}> 
      <BookingInner />
    </Suspense>
  );
}
