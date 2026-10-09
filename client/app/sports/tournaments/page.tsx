"use client";
import "./index.css";
import "./App.css";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Download, RotateCcw, PartyPopper, CreditCard } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PlayerData {
    fullName: string;
    age: string;
    phone: string;
    email: string;
}

interface PartnerData {
    [key: string]: string;
}

interface TournamentRegistrationResponse {
    id: string;
    tournamentName: string;
    registrationNumber?: string;
    invoiceNumber?: string;
    invoiceUrl?: string;
    paymentStatus: string;
    amount: number;
    currency: string;
    categories: string[];
    categoryLabels: string[];
    partnerNames?: Record<string, string>;
    player: PlayerData;
    registrationDate?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
}

const categoryLabels: Record<string, string> = {
    mixed_doubles: "Mixed Doubles",
    mens_doubles: "Men's Doubles",
    womens_doubles: "Women's Doubles",
    veterans_battle: "Veterans Battle",
};

const REGISTRATION_FEE = 1000;

const Index = () => {
    const { user, loading: authLoading } = useAuth();
    const [formData, setFormData] = useState<PlayerData>({
        fullName: "",
        age: "",
        phone: "",
        email: "",
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [partnerNames, setPartnerNames] = useState<PartnerData>({});
    const [errors, setErrors] = useState<Partial<Record<keyof PlayerData, string>>>({});
    const [isPaying, setIsPaying] = useState(false);
    const [confirmedRegistration, setConfirmedRegistration] = useState<TournamentRegistrationResponse | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            setFormData((current) => ({
                ...current,
                fullName: current.fullName || user.name || "",
                email: current.email || user.email || "",
                phone: current.phone || user.phone || "",
            }));
        }
    }, [authLoading, user]);

    useEffect(() => {
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    if (authLoading) {
        return (
            <div>
                <Navbar />
                <div id="root" className="bg-background py-8 px-4">
                    <div className="mx-auto w-full max-w-3xl space-y-6 card">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <div className="h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-primary" />
                            <CardContent className="p-10 md:p-12 flex flex-col items-center justify-center gap-4 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Checking login</h2>
                                    <p className="text-sm text-muted-foreground">Please wait while we verify your account.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const handleInputChange = (field: keyof PlayerData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const handleCategoryToggle = (category: string) => {
        setSelectedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category]
        );
    };

    const handlePartnerNameChange = (category: string, value: string) => {
        setPartnerNames((prev) => ({ ...prev, [category]: value }));
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof PlayerData, string>> = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = "Name is required";
        }

        if (!formData.age || Number(formData.age) < 5 || Number(formData.age) > 99) {
            newErrors.age = "Enter valid age (5-99)";
        }

        if (!formData.phone.match(/^\d{10}$/)) {
            newErrors.phone = "Enter 10-digit phone number";
        }

        if (selectedCategories.length === 0) {
            toast.error("Please select at least one category");
            return false;
        }

        // Validate partner names for selected categories
        for (const category of selectedCategories) {
            if (!partnerNames[category]?.trim()) {
                toast.error(`Partner name is required for ${categoryLabels[category]}`);
                return false;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (isPaying) return;

        if (!validateForm()) {
            toast.error("Please fill in all required fields");
            return;
        }

        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

        if (!razorpayKey) {
            toast.error("Razorpay is not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID.");
            return;
        }

        if (!window.Razorpay) {
            toast.error("Payment gateway is still loading. Please try again.");
            return;
        }

        setIsPaying(true);

        try {
            const response = await fetch("/api/sports/tournaments/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    player: {
                        fullName: formData.fullName.trim(),
                        age: Number(formData.age),
                        phone: formData.phone,
                        email: formData.email.trim() || undefined,
                    },
                    categories: selectedCategories,
                    partnerNames: partnerNames,
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to create registration order");
            }

            const orderData = data.data;

            const razorpay = new window.Razorpay({
                key: razorpayKey,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Nagaland Pickleball Classic",
                description: "Tournament Registration",
                order_id: orderData.orderId,
                handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }) => {
                    try {
                        const verifyResponse = await fetch("/api/sports/tournaments/verify-payment", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                ...response,
                                registrationId: orderData.registrationId,
                            }),
                        });

                        const verifyData = await verifyResponse.json();
                        if (!verifyResponse.ok || !verifyData.success) {
                            throw new Error(verifyData.message || "Payment verification failed");
                        }

                        setConfirmedRegistration(verifyData.data.registration);
                        toast.success("Payment successful and registration confirmed");
                    } catch (error: any) {
                        const errorMessage = error instanceof Error ? error.message : "Payment verification failed";
                        toast.error(errorMessage);
                    } finally {
                        setIsPaying(false);
                    }
                },
                prefill: {
                    name: formData.fullName,
                    email: formData.email,
                    contact: formData.phone,
                },
                notes: {
                    tournament: "Nagaland Pickleball Classic Tournament 2026",
                },
                theme: {
                    color: "#15803D",
                },
                modal: {
                    ondismiss: () => {
                        setIsPaying(false);
                        toast.error("Payment cancelled");
                    },
                },
            });

            razorpay.open();
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : "Failed to start payment";
            toast.error(errorMessage);
            setIsPaying(false);
        }
    };

    const reset = () => {
        setFormData({
            fullName: user?.name || "",
            age: "",
            phone: user?.phone || "",
            email: user?.email || "",
        });
        setSelectedCategories([]);
        setPartnerNames({});
        setErrors({});
        setConfirmedRegistration(null);
        setIsPaying(false);
    };

    if (confirmedRegistration) {
        return (
            <div>
                <Navbar />
                <div id="root" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,98,16,0.18),_transparent_28%),linear-gradient(180deg,#060d1a_0%,#09162a_52%,#0d1b30_100%)] py-8 px-4 md:px-6">
                    <div className="mx-auto w-full max-w-7xl space-y-8">
                        <Card className="overflow-hidden rounded-[32px] border border-orange-500/20 bg-white/95 shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
                            <div className="bg-[#071126] px-6 py-5 md:px-8 border-b border-white/10 text-white">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f56210] text-white shadow-lg">
                                        <CheckCircle2 className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.32em] text-orange-400">Entry Confirmed</p>
                                        <h2 className="mt-2 text-3xl font-black text-white">Your Tournament Entry Is Confirmed</h2>
                                        <p className="mt-2 text-sm text-white/70">Check your registration details below and download the PDF receipt for your reference.</p>
                                    </div>
                                </div>
                            </div>
                            <CardContent className="p-6 md:p-8">
                                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                                    <div className="space-y-6">
                                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                                            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Registration Details</p>
                                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tournament</p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedRegistration.tournamentName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Registration Number</p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedRegistration.registrationNumber}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Date</p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedRegistration.registrationDate ? new Date(confirmedRegistration.registrationDate).toLocaleDateString("en-IN") : "Confirmed"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Amount Paid</p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-900">₹{confirmedRegistration.amount.toLocaleString("en-IN")}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                                            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Selected Categories</p>
                                            <div className="mt-4 space-y-3">
                                                {confirmedRegistration.categories.map((category: string, index: number) => (
                                                    <div key={category} className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                                                                {confirmedRegistration.categoryLabels[index]}
                                                            </span>
                                                        </div>
                                                        {confirmedRegistration.partnerNames?.[category] && (
                                                            <div className="ml-2 text-sm text-slate-600">
                                                                Partner: <span className="font-medium">{confirmedRegistration.partnerNames[category]}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                                            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Player Details</p>
                                            <div className="mt-4 space-y-2">
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-sm font-black text-slate-900">{confirmedRegistration.player.fullName}</p>
                                                    <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                                        <p>Phone: {confirmedRegistration.player.phone}</p>
                                                        <p>Age: {confirmedRegistration.player.age}</p>
                                                        {confirmedRegistration.player.email && <p className="sm:col-span-2">Email: {confirmedRegistration.player.email}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="rounded-[24px] bg-slate-950 p-5 text-white">
                                            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">Receipt & Invoice</p>
                                            <p className="mt-3 text-sm text-white/75">Download your tournament registration PDF and keep your registration details handy.</p>
                                            <div className="mt-5 space-y-3">
                                                {confirmedRegistration.invoiceUrl ? (
                                                    <a
                                                        href={confirmedRegistration.invoiceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f56210] px-4 py-3 text-sm font-black text-white transition hover:bg-[#d84f03]"
                                                    >
                                                        <Download className="h-4 w-4" /> Download PDF
                                                    </a>
                                                ) : (
                                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                                                        PDF will be available shortly.
                                                    </div>
                                                )}
                                                <Button onClick={reset} variant="ghost" className="w-full gap-2 text-white hover:bg-white/10 hover:text-white">
                                                    <RotateCcw className="h-4 w-4" /> Register Another Entry
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="rounded-[24px] border border-slate-200 bg-orange-50 p-5">
                                            <div className="flex items-start gap-3">
                                                <PartyPopper className="mt-0.5 h-5 w-5 text-[#f56210]" />
                                                <div>
                                                    <p className="text-sm font-black text-[#071126]">Registration saved successfully</p>
                                                    <p className="mt-1 text-sm text-slate-600">You can use the registration number to track this entry from the admin or support team.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
                  
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 shadow-2xl border border-green-400/30">
                        <div className="flex items-center justify-center gap-3 text-white">
                            <CheckCircle2 className="h-8 w-8 flex-shrink-0" />
                            <div className="text-center">
                                <h3 className="text-xl sm:text-2xl font-bold">Tournament Completed!</h3>
                                <p className="text-sm sm:text-base text-white/90 mt-1">
                                    Thank you to all participants. Registration is now closed.
                                </p>
                            </div>
                        </div>
                    </div>
        // <div>
        //     <Navbar />
        //     <div id="root" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,98,16,0.18),_transparent_28%),linear-gradient(180deg,#060d1a_0%,#09162a_52%,#0d1b30_100%)] py-2 px-3 sm:py-3 sm:px-4 md:py-4 md:px-6">
        //         <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6">
         
        //             <div className="grid gap-4 sm:gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
        //                 <div className="hidden xl:block xl:sticky xl:top-24">
        //                     <div className="space-y-6">
        //                         <Image 
        //                             src="/images/npatournament.jpeg" 
        //                             alt="Tournament Poster" 
        //                             width={500} 
        //                             height={320}
        //                             className="w-full rounded-2xl shadow-lg object-cover"
        //                         />
        //                     </div>
        //                 </div>

        //                 <div className="xl:hidden">
        //                     <div className="mb-4 sm:mb-6">
        //                         <Image 
        //                             src="/images/npatournament.jpeg" 
        //                             alt="Tournament Poster" 
        //                             width={800} 
        //                             height={400}
        //                             className="w-full rounded-xl sm:rounded-2xl shadow-lg object-cover h-auto"
        //                         />
        //                     </div>
        //                 </div>

        //                 <Card className="overflow-hidden rounded-2xl sm:rounded-[32px] border border-orange-500/20 bg-white/95 shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
        //                     <div className="bg-[#071126] px-4 py-4 sm:px-6 sm:py-5 md:px-8 border-b border-white/10 text-white">
        //                         <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] sm:tracking-[0.32em] text-orange-400">Official Player Registration</p>
        //                         <h2 className="mt-1.5 sm:mt-2 text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">Tournament Registration</h2>
        //                         <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/70 leading-relaxed">
        //                             Pay ₹1,000 registration fee to be eligible to play in all categories (Mixed Doubles, Men's Doubles, Women's Doubles).
        //                         </p>
        //                     </div>
        //                     <CardContent className="p-3 sm:p-4 md:p-6">
        //                         <div className="space-y-6">
        //                             <div className="space-y-3">
        //                                 <div className="space-y-2">
        //                                     <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
        //                                         Full Name <span className="text-red-500">*</span>
        //                                     </Label>
        //                                     <Input
        //                                         id="fullName"
        //                                         type="text"
        //                                         placeholder="Enter your full name"
        //                                         value={formData.fullName}
        //                                         onChange={(e) => handleInputChange("fullName", e.target.value)}
        //                                         className={errors.fullName ? "border-red-500" : ""}
        //                                     />
        //                                     {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
        //                                 </div>

        //                                 <div className="space-y-2">
        //                                     <Label htmlFor="age" className="text-sm font-semibold text-slate-700">
        //                                         Age <span className="text-red-500">*</span>
        //                                     </Label>
        //                                     <Input
        //                                         id="age"
        //                                         type="number"
        //                                         placeholder="Enter your age"
        //                                         value={formData.age}
        //                                         onChange={(e) => handleInputChange("age", e.target.value)}
        //                                         className={errors.age ? "border-red-500" : ""}
        //                                         min="5"
        //                                         max="99"
        //                                     />
        //                                     {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
        //                                 </div>

        //                                 <div className="space-y-2">
        //                                     <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
        //                                         Phone Number <span className="text-red-500">*</span>
        //                                     </Label>
        //                                     <Input
        //                                         id="phone"
        //                                         type="tel"
        //                                         placeholder="Enter 10-digit phone number"
        //                                         value={formData.phone}
        //                                         onChange={(e) => handleInputChange("phone", e.target.value)}
        //                                         className={errors.phone ? "border-red-500" : ""}
        //                                         maxLength={10}
        //                                     />
        //                                     {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        //                                 </div>

        //                                 <div className="space-y-2">
        //                                     <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
        //                                         Email <span className="text-slate-400">(Optional)</span>
        //                                     </Label>
        //                                     <Input
        //                                         id="email"
        //                                         type="email"
        //                                         placeholder="Enter your email (optional)"
        //                                         value={formData.email}
        //                                         onChange={(e) => handleInputChange("email", e.target.value)}
        //                                     />
        //                                 </div>
        //                             </div>

        //                             <div className="space-y-3">
        //                                 <Label className="text-sm font-semibold text-slate-700">
        //                                     Select Categories <span className="text-red-500">*</span>
        //                                 </Label>
        //                                 <p className="text-xs text-slate-500">Select all categories you want to participate in. ₹1,000 covers all selected categories.</p>
        //                                 <div className="space-y-3">
        //                                     {Object.entries(categoryLabels).map(([key, label]) => (
        //                                         <div key={key} className="space-y-2">
        //                                             <div className="flex items-center space-x-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition">
        //                                                 <Checkbox
        //                                                     id={key}
        //                                                     checked={selectedCategories.includes(key)}
        //                                                     onCheckedChange={() => handleCategoryToggle(key)}
        //                                                 />
        //                                                 <Label
        //                                                     htmlFor={key}
        //                                                     className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
        //                                                 >
        //                                                     {label}
        //                                                 </Label>
        //                                             </div>
        //                                             {selectedCategories.includes(key) && (
        //                                                 <div className="ml-6">
        //                                                     <Label htmlFor={`${key}-partner`} className="text-sm font-semibold text-slate-700">
        //                                                         Partner Name <span className="text-red-500">*</span>
        //                                                     </Label>
        //                                                     <Input
        //                                                         id={`${key}-partner`}
        //                                                         type="text"
        //                                                         placeholder={`Enter partner name for ${label}`}
        //                                                         value={partnerNames[key] || ""}
        //                                                         onChange={(e) => handlePartnerNameChange(key, e.target.value)}
        //                                                         className="mt-1"
        //                                                     />
        //                                                 </div>
        //                                             )}
        //                                         </div>
        //                                     ))}
        //                                 </div>
        //                             </div>

        //                             <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
        //                                 <div className="flex items-start gap-3">
        //                                     <div className="flex-shrink-0">
        //                                         <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center">
        //                                             <span className="text-orange-600 font-bold text-xs">₹</span>
        //                                         </div>
        //                                     </div>
        //                                     <div className="flex-1">
        //                                         <p className="text-sm font-bold text-orange-900">Registration Fee: ₹{REGISTRATION_FEE.toLocaleString("en-IN")}</p>
        //                                         <p className="text-xs text-orange-700 mt-1">Single payment covers all selected categories</p>
        //                                     </div>
        //                                 </div>
        //                             </div>

        //                             <Button
        //                                 onClick={handleSubmit}
        //                                 disabled={isPaying}
        //                                 className="w-full gap-2 text-sm bg-[#f56210] text-white hover:bg-[#d84f03] shadow-md hover:shadow-lg transition-shadow h-10 active:scale-[0.98]"
        //                             >
        //                                 {isPaying ? (
        //                                     <>
        //                                         <CreditCard className="w-4 h-4 animate-pulse" />
        //                                         Processing Payment...
        //                                     </>
        //                                 ) : (
        //                                     <>
        //                                         <CreditCard className="w-4 h-4" />
        //                                         Pay ₹{REGISTRATION_FEE.toLocaleString("en-IN")} & Register
        //                                     </>
        //                                 )}
        //                             </Button>
        //                         </div>
        //                     </CardContent>
        //                 </Card>
        //             </div>
        //         </div>
        //     </div>
        //     <Footer />
        // </div>
    );
};

export default Index;
