"use client";
import "./index.css";
import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, CheckCircle2, PartyPopper, RotateCcw, Download, CreditCard, Loader2 } from "lucide-react";
import EventHeader from "./components/EventHeader";
import StepIndicator from "./components/StepIndicator";
import StepCategory from "./components/StepCategory";
import StepPlayerDetails, { type PlayerData } from "./components/StepPlayerDetails";
import StepConfirmation from "./components/StepConfirmation";
import Footer from "@/app/Footer";
import Navbar from "@/app/Navbar";

declare global {
    interface Window {
        Razorpay: any;
    }
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
    players: PlayerData[];
    registrationDate?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
}

const emptyPlayer: PlayerData = { fullName: "", age: "", gender: "", phone: "", email: "" };

const categoryLabels: Record<string, string> = {
    mens_doubles: "Men's Doubles",
    womens_doubles: "Women's Doubles",
    mixed_doubles: "Mixed Doubles",
    team_event: "Team Event",
};

const validatePlayer = (p: PlayerData): Partial<Record<keyof PlayerData, string>> => {
    const e: Partial<Record<keyof PlayerData, string>> = {};
    if (!p.fullName.trim()) e.fullName = "Required";
    if (!p.age || Number(p.age) < 5 || Number(p.age) > 99) e.age = "Enter valid age";
    if (!p.gender) e.gender = "Select gender";
    if (!p.phone.match(/^\d{10}$/)) e.phone = "Enter 10-digit number";
    if (!p.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter valid email";
    return e;
};

const Index = () => {
    const { user, loading: authLoading } = useAuth();
    const [step, setStep] = useState(0);
    const [categories, setCategories] = useState<string[]>([]);
    const [player1, setPlayer1] = useState<PlayerData>({ ...emptyPlayer });
    const [player2, setPlayer2] = useState<PlayerData>({ ...emptyPlayer });
    const [p1Errors, setP1Errors] = useState<Partial<Record<keyof PlayerData, string>>>({});
    const [p2Errors, setP2Errors] = useState<Partial<Record<keyof PlayerData, string>>>({});
    const [checks, setChecks] = useState([false, false, false]);
    const [isPaying, setIsPaying] = useState(false);
    const [confirmedRegistration, setConfirmedRegistration] = useState<TournamentRegistrationResponse | null>(null);

    const entryFee = useMemo(() => categories.length * 1500, [categories]);

    useEffect(() => {
        if (!authLoading && user) {
            setPlayer1((current) => ({
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
                <EventHeader />
                <div id="root" className="min-h-screen bg-background py-8 px-4">
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

    const next = () => {
        if (step === 0 && categories.length === 0) {
            toast.error("Please select at least one category");
            return;
        }
        if (step === 1) {
            const errs = validatePlayer(player1);
            setP1Errors(errs);
            if (Object.keys(errs).length) return;
        }
        if (step === 2) {
            const errs = validatePlayer(player2);
            setP2Errors(errs);
            if (Object.keys(errs).length) return;
        }
        setStep((s) => Math.min(s + 1, 3));
    };

    const back = () => setStep((s) => Math.max(s - 1, 0));

    const submit = () => {
        if (isPaying) {
            return;
        }

        if (!checks.every(Boolean)) {
            toast.error("Please confirm all checkboxes");
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

        fetch("/api/sports/tournaments/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                categories,
                player1,
                player2,
                checks,
            }),
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to create registration order");
                }
                return data.data;
            })
            .then((orderData) => {
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
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : "Payment verification failed";
                            toast.error(errorMessage);
                        } finally {
                            setIsPaying(false);
                        }
                    },
                    prefill: {
                        name: `${player1.fullName} & ${player2.fullName}`,
                        email: player1.email,
                        contact: player1.phone,
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
            })
            .catch((error) => {
                const errorMessage = error instanceof Error ? error.message : "Failed to start payment";
                toast.error(errorMessage);
                setIsPaying(false);
            });
    };

    const reset = () => {
        setStep(0);
        setCategories([]);
        setPlayer1({ ...emptyPlayer });
        setPlayer2({ ...emptyPlayer });
        setChecks([false, false, false]);
        setP1Errors({});
        setP2Errors({});
        setConfirmedRegistration(null);
        setIsPaying(false);
    };

    if (confirmedRegistration) {
        return (
            <div>
                <Navbar />
                <EventHeader />
                <div id="root" className="min-h-screen bg-background py-8 px-4">
                    <div className="mx-auto w-full max-w-3xl space-y-6 card">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <div className="h-2 bg-gradient-to-r from-primary via-emerald-400 to-primary" />
                            <CardContent className="p-8 md:p-12 text-center space-y-6">
                                <div className="relative inline-flex items-center justify-center">
                                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-accent animate-ping opacity-30 mx-auto" />
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg relative">
                                        <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-2">
                                        <PartyPopper className="w-6 h-6 text-primary" />
                                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Registration Successful!</h2>
                                        <PartyPopper className="w-6 h-6 text-primary scale-x-[-1]" />
                                    </div>
                                    <p className="text-muted-foreground">
                                        Your payment has been verified and your team has been registered for the Nagaland Pickleball Classic Tournament 2026.
                                    </p>
                                </div>

                                <Card className="border bg-muted/30">
                                    <CardContent className="p-6 space-y-5 text-left">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Registration ID</p>
                                                <p className="font-semibold text-foreground">{confirmedRegistration.registrationNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Payment ID</p>
                                                <p className="font-semibold text-foreground break-all">{confirmedRegistration.razorpayPaymentId}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Categories</p>
                                            <div className="flex flex-wrap gap-2">
                                                {confirmedRegistration.categoryLabels.map((label) => (
                                                    <span key={label} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium">
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {[{ label: "Player 1", data: confirmedRegistration.players[0] }, { label: "Player 2", data: confirmedRegistration.players[1] }].map(({ label, data }) => (
                                                <div key={label} className="p-4 rounded-xl bg-card border space-y-2">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
                                                    <p className="font-semibold text-foreground">{data.fullName}</p>
                                                    <div className="text-sm text-muted-foreground space-y-0.5">
                                                        <p>Age: {data.age} · {data.gender === "male" ? "Male" : "Female"}</p>
                                                        <p>{data.phone}</p>
                                                        <p>{data.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-2 border-t text-center">
                                            <p className="text-sm text-muted-foreground">
                                                Entry Fee Paid: <span className="font-semibold text-foreground">₹{confirmedRegistration.amount.toLocaleString("en-IN")}</span>
                                                <span className="text-xs ml-1">({confirmedRegistration.categories.length} {confirmedRegistration.categories.length === 1 ? "category" : "categories"} × ₹1,500)</span>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <p className="text-sm text-muted-foreground">
                                    A confirmation will be sent to <span className="font-medium text-foreground">{confirmedRegistration.players[0]?.email}</span>
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <Button
                                        onClick={() => {
                                            if (confirmedRegistration.invoiceUrl) {
                                                window.open(confirmedRegistration.invoiceUrl, "_blank");
                                            } else {
                                                toast.error("Invoice is not available yet");
                                            }
                                        }}
                                        size="lg"
                                        className="gap-2 mt-2"
                                    >
                                        <Download className="w-4 h-4" /> Download PDF Receipt
                                    </Button>

                                    <Button onClick={reset} variant="outline" size="lg" className="gap-2 mt-2">
                                        <RotateCcw className="w-4 h-4" /> Register Another Team
                                    </Button>
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
        <div>
            <Navbar />
            <EventHeader />
            <div id="root" className="min-h-screen bg-background py-8 px-4">
                <div className="mx-auto w-full max-w-3xl space-y-6 card">
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-primary" />
                        <CardContent className="p-6 md:p-8">
                            <StepIndicator currentStep={step} />
                            <div className="min-h-[320px]">
                                {step === 0 && <StepCategory selected={categories} onChange={setCategories} />}
                                {step === 1 && <StepPlayerDetails title="Player 1 Details" data={player1} onChange={setPlayer1} errors={p1Errors} />}
                                {step === 2 && <StepPlayerDetails title="Player 2 Details" data={player2} onChange={setPlayer2} errors={p2Errors} />}
                                {step === 3 && <StepConfirmation checks={checks} onChange={setChecks} />}
                            </div>
                            <div className="pt-4 text-center text-sm text-muted-foreground">
                                Tournament Entry Fee: <span className="font-semibold text-foreground">₹{entryFee.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between gap-3 pt-6 mt-6 border-t">
                                <Button variant="ghost" onClick={back} disabled={step === 0} className="gap-2">
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </Button>
                                {step < 3 ? (
                                    <Button onClick={next} size="lg" className="gap-2 shadow-md hover:shadow-lg transition-shadow">
                                        Next <ArrowRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button onClick={submit} size="lg" className="gap-2 shadow-md hover:shadow-lg transition-shadow" disabled={isPaying}>
                                        {isPaying ? <CreditCard className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                        {isPaying ? "Processing Payment..." : "Pay & Complete Registration"}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </div>
        </div>
    );
};

export default Index;