"use client";
import "./index.css";
import "./App.css";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, CheckCircle2, PartyPopper, RotateCcw, Download, CreditCard, Loader2, Calendar, MapPin, IndianRupee } from "lucide-react";
import EventHeader from "./components/EventHeader";
import StepIndicator from "./components/StepIndicator";
import StepRegistrationType from "./components/StepRegistrationType";
import StepTeamInfo from "./components/StepTeamInfo";
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
    registrationType?: "individual" | "team";
    teamName?: string;
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
const ENTRY_FEE_PER_PLAYER = 1500;

const singlePlayerCategories = new Set(["mens_singles", "womens_singles"]);

const categoryLabels: Record<string, string> = {
    mens_singles: "Men's Singles",
    womens_singles: "Women's Singles",
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
    const [registrationType, setRegistrationType] = useState<"individual" | "team" | "">("");
    const [teamName, setTeamName] = useState("");
    const [teamNameError, setTeamNameError] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [player1, setPlayer1] = useState<PlayerData>({ ...emptyPlayer });
    const [player2, setPlayer2] = useState<PlayerData>({ ...emptyPlayer });

    const [p1Errors, setP1Errors] = useState<Partial<Record<keyof PlayerData, string>>>({});
    const [p2Errors, setP2Errors] = useState<Partial<Record<keyof PlayerData, string>>>({});
    const [checks, setChecks] = useState([false, false, false]);
    const [isPaying, setIsPaying] = useState(false);
    const [confirmedRegistration, setConfirmedRegistration] = useState<TournamentRegistrationResponse | null>(null);

    const requiredPlayerCount = useMemo(() => {
        if (categories.length === 0) {
            return registrationType === "individual" ? 1 : 2;
        }

        const hasOnlySingles = categories.every((category) => singlePlayerCategories.has(category));
        return hasOnlySingles ? 1 : 2;
    }, [categories, registrationType]);

    const stepLabels = useMemo(() => {
        const labels = ["Type"];

        if (registrationType === "team") {
            labels.push("Team");
        }

        labels.push("Event", "Player 1");

        if (requiredPlayerCount === 2) {
            labels.push("Player 2");
        }

        labels.push("Confirm");
        return labels;
    }, [registrationType, requiredPlayerCount]);

    const categoryStep = registrationType === "team" ? 2 : 1;
    const player1Step = categoryStep + 1;
    const player2Step = requiredPlayerCount === 2 ? player1Step + 1 : -1;
    const confirmStep = requiredPlayerCount === 2 ? player1Step + 2 : player1Step + 1;
    const entryFee = useMemo(() => ENTRY_FEE_PER_PLAYER * requiredPlayerCount, [requiredPlayerCount]);
    const hasSelectedCategory = categories.length > 0;
    const isTeamRegistration = registrationType === "team";
    const isDirectRegistration = isTeamRegistration || categories.includes("team_event");
    const feeSummaryText = isDirectRegistration
        ? isTeamRegistration ? "Team registration does not require any payment." : "No payment required for Team Event registration"
        : `₹1,500 per player for ${requiredPlayerCount} registered player${requiredPlayerCount > 1 ? "s" : ""}`;

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
        if (registrationType !== "team") {
            setTeamName("");
            setTeamNameError("");
        }
    }, [registrationType]);

    useEffect(() => {
        if (requiredPlayerCount === 1) {
            setPlayer2({ ...emptyPlayer });
            setP2Errors({});
        }
    }, [requiredPlayerCount]);

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
                {/* <EventHeader /> */}
                <div id="root" className=" bg-background py-8 px-4">
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
        if (step === 0) {
            if (!registrationType) {
                toast.error("Please choose individual or team registration");
                return;
            }

            setStep((s) => Math.min(s + 1, confirmStep));
            return;
        }

        if (registrationType === "team" && step === 1) {
            if (!teamName.trim()) {
                setTeamNameError("Team name is required");
                return;
            }

            setTeamNameError("");
            setStep((s) => Math.min(s + 1, confirmStep));
            return;
        }

        if (step === categoryStep && categories.length === 0) {
            toast.error("Please select at least one category");
            return;
        }

        if (step === player1Step) {
            const errs = validatePlayer(player1);
            setP1Errors(errs);
            if (Object.keys(errs).length) return;
        }

        if (requiredPlayerCount === 2 && step === player2Step) {
            const errs = validatePlayer(player2);
            setP2Errors(errs);
            if (Object.keys(errs).length) return;
        }

        setStep((s) => Math.min(s + 1, confirmStep));
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

        const isDirectRegistration = isTeamRegistration || categories.includes("team_event");
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

        if (!isDirectRegistration) {
            if (!razorpayKey) {
                toast.error("Razorpay is not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID.");
                return;
            }

            if (!window.Razorpay) {
                toast.error("Payment gateway is still loading. Please try again.");
                return;
            }
        }

        setIsPaying(true);

        fetch("/api/sports/tournaments/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                registrationType,
                teamName: registrationType === "team" ? teamName.trim() : undefined,
                categories,
                player1,
                player2: requiredPlayerCount === 2 ? player2 : undefined,
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
                if (!orderData.requiresPayment) {
                    setConfirmedRegistration(orderData.registration);
                    toast.success("Registration completed successfully");
                    setIsPaying(false);
                    return;
                }

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
                            toast.success("Payment successful and player registration confirmed");
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : "Payment verification failed";
                            toast.error(errorMessage);
                        } finally {
                            setIsPaying(false);
                        }
                    },
                    prefill: {
                        name: requiredPlayerCount === 2 ? `${player1.fullName} & ${player2.fullName}` : player1.fullName,
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
        setRegistrationType("");
        setTeamName("");
        setTeamNameError("");
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
                <div id="root" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,98,16,0.18),_transparent_28%),linear-gradient(180deg,#060d1a_0%,#09162a_52%,#0d1b30_100%)] py-8 px-4 md:px-6">
                    <div className="mx-auto w-full max-w-7xl space-y-8">
                        {/* <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr] xl:items-start"> */}
                            {/* <div className="space-y-6 xl:sticky xl:top-24">
                                <Card className="rounded-[28px] border border-orange-500/20 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                    <CardContent className="p-6 space-y-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">Quick Details</p>
                                            <h2 className="mt-2 text-2xl font-black text-[#071126]">Registration Confirmed</h2>
                                        </div>
                                        <div className="grid gap-3">
                                            <div className="rounded-2xl bg-orange-50 p-4">
                                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-700">Registration ID</p>
                                                <p className="mt-2 text-2xl font-black text-[#071126]">{confirmedRegistration.registrationNumber || "Pending"}</p>
                                                <p className="mt-1 text-sm text-slate-600">Invoice Number: {confirmedRegistration.invoiceNumber || "Will be available shortly"}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div> */}

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
                                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Registration Type</p>
                                                        <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedRegistration.registrationType === "team" ? "Team Entry" : "Player Entry"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Date</p>
                                                        <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedRegistration.registrationDate ? new Date(confirmedRegistration.registrationDate).toLocaleDateString("en-IN") : "Confirmed"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Amount</p>
                                                        <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedRegistration.amount > 0 ? `₹${confirmedRegistration.amount.toLocaleString("en-IN")}` : "Direct Registration"}</p>
                                                    </div>
                                                    {confirmedRegistration.teamName ? (
                                                        <div className="sm:col-span-2">
                                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Team Name</p>
                                                            <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedRegistration.teamName}</p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                                                <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Selected Events</p>
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {confirmedRegistration.categoryLabels.map((label: string) => (
                                                        <span key={label} className="rounded-full bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                                                <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Player Details</p>
                                                <div className="mt-4 space-y-4">
                                                    {confirmedRegistration.players.map((player: PlayerData, index: number) => (
                                                        <div key={`${player.email}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                            <p className="text-sm font-black text-slate-900">Player {index + 1}: {player.fullName}</p>
                                                            <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                                                <p>Email: {player.email}</p>
                                                                <p>Phone: {player.phone}</p>
                                                                <p>Age: {player.age}</p>
                                                                <p>Gender: {player.gender}</p>
                                                            </div>
                                                        </div>
                                                    ))}
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
                                                        <p className="mt-1 text-sm text-slate-600">You can use the registration number and invoice number to track this entry from the admin or support team.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        {/* </div> */}
                    </div>
                </div>
                    <Footer />
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div id="root" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,98,16,0.18),_transparent_28%),linear-gradient(180deg,#060d1a_0%,#09162a_52%,#0d1b30_100%)] py-8 px-4 md:px-6">
                <div className="mx-auto w-full max-w-7xl space-y-8">
                    <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
                        <div className="space-y-6 xl:sticky xl:top-24">
                            <Image src="/images/npatournament.jpeg" alt="Tournament Poster" width={500} height={500} />
                        </div>

                        <Card className="overflow-hidden rounded-[32px] border border-orange-500/20 bg-white/95 shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
                            <div className="bg-[#071126] px-6 py-5 md:px-8 border-b border-white/10 text-white">
                                <p className="text-xs font-black uppercase tracking-[0.32em] text-orange-400">Official Player Registration</p>
                                <h2 className="mt-2 text-3xl font-black text-white">Complete Tournament Registration</h2>
                                <p className="mt-2 text-sm text-white/70">{isTeamRegistration ? `Fill out all steps carefully. Team registration is direct and no payment is collected.` : hasSelectedCategory ? (isDirectRegistration ? `Fill out all steps carefully. Team Event registration is direct and requires no payment.` : `Fill out all steps carefully. Entry fee is ₹1,500 per player, with ${requiredPlayerCount} players required for this registration.`) : `Choose your event type first to see the correct registration fee and player requirement.`}</p>
                            </div>
                            <CardContent className="p-6 md:p-8">
                                <StepIndicator currentStep={step} steps={stepLabels} />
                                <div className="mt-8 min-h-[320px]">
                                    {step === 0 && <StepRegistrationType value={registrationType} onChange={setRegistrationType} />}
                                    {registrationType === "team" && step === 1 && <StepTeamInfo teamName={teamName} onChange={setTeamName} error={teamNameError} />}
                                    {step === categoryStep && <StepCategory registrationType={registrationType} selected={categories} onChange={setCategories} />}
                                    {step === player1Step && <StepPlayerDetails title="Player 1 Details" data={player1} onChange={setPlayer1} errors={p1Errors} />}
                                    {requiredPlayerCount === 2 && step === player2Step && <StepPlayerDetails title="Player 2 Details" data={player2} onChange={setPlayer2} errors={p2Errors} />}
                                    {step === confirmStep && <StepConfirmation checks={checks} onChange={setChecks} />}
                                </div>

                                {!isTeamRegistration && hasSelectedCategory ? (
                                    <div className="mt-6 rounded-2xl bg-orange-50 px-4 py-3 text-center text-sm text-slate-700">
                                        {isDirectRegistration ? <><span className="font-black text-[#071126]">Direct Registration</span> <span className="text-slate-500">(No payment required)</span></> : <>Total Player Fee: <span className="font-black text-[#071126]">₹{entryFee.toLocaleString("en-IN")}</span> <span className="text-slate-500">({requiredPlayerCount} player{requiredPlayerCount > 1 ? "s" : ""} × ₹1,500)</span></>}
                                    </div>
                                ) : null}

                                <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-slate-200">
                                    <Button variant="ghost" onClick={back} disabled={step === 0} className="gap-2 text-slate-700 hover:text-slate-950">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </Button>
                                    {step < confirmStep ? (
                                        <Button onClick={next} size="lg" className="gap-2 bg-[#f56210] text-white hover:bg-[#d84f03] shadow-md hover:shadow-lg transition-shadow">
                                            Next <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <Button onClick={submit} size="lg" className="gap-2 bg-[#071126] text-white hover:bg-[#0c1d37] shadow-md hover:shadow-lg transition-shadow" disabled={isPaying}>
                                            {isPaying ? <CreditCard className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                            {isPaying ? (isDirectRegistration ? "Completing Registration..." : "Processing Payment...") : (isDirectRegistration ? "Complete Registration" : "Pay & Complete Registration")}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
};

export default Index;