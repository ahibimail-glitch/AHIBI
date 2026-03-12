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
import StepTeamPlayerDetails, { type TeamPlayerData } from "./components/StepTeamPlayerDetails";
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
const emptyTeamPlayer: TeamPlayerData = { fullName: "", gender: "" };
const ENTRY_FEE_PER_PLAYER = 1500;

const singlePlayerCategories = new Set([]); // All categories require 2 players

const categoryLabels: Record<string, string> = {
    mixed_doubles: "Mixed Doubles",
    mens_doubles: "Men's Doubles",
    womens_doubles: "Women's Doubles",
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

const validateTeamPlayer = (p: TeamPlayerData): Partial<Record<keyof TeamPlayerData, string>> => {
    const e: Partial<Record<keyof TeamPlayerData, string>> = {};
    if (!p.fullName.trim()) e.fullName = "Required";
    if (!p.gender) e.gender = "Select gender";
    return e;
};

const getRequiredPlayersForCategory = (categoryId: string) => {
    return 2; // All categories require 2 players
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

    // Individual player state for individual registrations (per category)
    const [individualPlayers, setIndividualPlayers] = useState<Record<string, PlayerData[]>>({});
    // Team player state for team registrations
    const [teamPlayers, setTeamPlayers] = useState<Record<string, TeamPlayerData[]>>({});
    const [p1Errors, setP1Errors] = useState<Partial<Record<keyof PlayerData, string>>>({});
    const [p2Errors, setP2Errors] = useState<Partial<Record<keyof PlayerData, string>>>({});
    const [individualPlayerErrors, setIndividualPlayerErrors] = useState<Record<string, Partial<Record<keyof PlayerData, string>>[]>>({});
    const [teamPlayerErrors, setTeamPlayerErrors] = useState<Record<string, Partial<Record<keyof TeamPlayerData, string>>[]>>({});
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

        labels.push("Event");

        if (registrationType === "team") {
            // Add player details steps for each selected category
            categories.forEach((category) => {
                const requiredPlayers = getRequiredPlayersForCategory(category);
                const categoryLabel = categoryLabels[category];
                if (requiredPlayers === 1) {
                    labels.push(`${categoryLabel} Player`);
                } else {
                    labels.push(`${categoryLabel} Player 1`);
                    labels.push(`${categoryLabel} Player 2`);
                }
            });
        } else {
            // Add player details steps for each selected category (individual registration)
            categories.forEach((category) => {
                const requiredPlayers = getRequiredPlayersForCategory(category);
                const categoryLabel = categoryLabels[category];
                if (requiredPlayers === 1) {
                    labels.push(`${categoryLabel} Player`);
                } else {
                    labels.push(`${categoryLabel} Player 1`);
                    labels.push(`${categoryLabel} Player 2`);
                }
            });
        }

        labels.push("Confirm");
        return labels;
    }, [registrationType, requiredPlayerCount, categories]);

    const categoryStep = registrationType === "team" ? 2 : 1;
    const player1Step = categoryStep + 1;
    const player2Step = requiredPlayerCount === 2 ? player1Step + 1 : -1;

    // Calculate confirm step based on registration type and selected categories
    const confirmStep = useMemo(() => {
        let stepCount = categoryStep + 1; // Start after category step
        for (const category of categories) {
            const requiredPlayers = getRequiredPlayersForCategory(category);
            stepCount += requiredPlayers;
        }
        return stepCount;
    }, [registrationType, categories, categoryStep]);

    // Calculate unique players and total amount for pricing summary
    const pricingSummary = useMemo(() => {
        if (registrationType !== "individual") {
            return { uniquePlayerCount: 0, totalAmount: 0 };
        }

        // Collect all player names from all categories
        const allPlayerNames: string[] = [];
        for (const category of categories) {
            const categoryPlayers = individualPlayers[category] || [];
            categoryPlayers.forEach(player => {
                if (player?.fullName?.trim()) {
                    allPlayerNames.push(player.fullName.trim().toLowerCase());
                }
            });
        }

        // Count unique players
        const uniquePlayerNames = new Set(allPlayerNames);
        const uniquePlayerCount = uniquePlayerNames.size;
        const totalAmount = uniquePlayerCount * ENTRY_FEE_PER_PLAYER;

        return { uniquePlayerCount, totalAmount };
    }, [registrationType, categories, individualPlayers]);

    const entryFee = useMemo(() => ENTRY_FEE_PER_PLAYER * requiredPlayerCount, [requiredPlayerCount]);
    const hasSelectedCategory = categories.length > 0;
    const isTeamRegistration = registrationType === "team";
    const isDirectRegistration = isTeamRegistration;
    const feeSummaryText = isDirectRegistration
        ? "Team registration does not require any payment."
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
            setPlayer2((prevPlayer2) => ({ ...prevPlayer2, ...emptyPlayer }));
            setP2Errors({});
        }
    }, [requiredPlayerCount]);

    useEffect(() => {
        if (registrationType === "team" && categories.length > 0) {
            setTeamPlayers((prevTeamPlayers) => {
                const newTeamPlayers: Record<string, TeamPlayerData[]> = {};
                for (const category of categories) {
                    const requiredPlayers = getRequiredPlayersForCategory(category);
                    if (!prevTeamPlayers[category] || prevTeamPlayers[category].length !== requiredPlayers) {
                        newTeamPlayers[category] = Array(requiredPlayers).fill(null).map(() => ({ ...emptyTeamPlayer }));
                    } else {
                        newTeamPlayers[category] = prevTeamPlayers[category];
                    }
                }
                return newTeamPlayers;
            });
        }
    }, [registrationType, categories]);

    useEffect(() => {
        if (registrationType === "individual" && categories.length > 0) {
            setIndividualPlayers((prevIndividualPlayers) => {
                const newIndividualPlayers: Record<string, PlayerData[]> = {};
                for (const category of categories) {
                    const requiredPlayers = getRequiredPlayersForCategory(category);
                    if (!prevIndividualPlayers[category] || prevIndividualPlayers[category].length !== requiredPlayers) {
                        newIndividualPlayers[category] = Array(requiredPlayers).fill(null).map((_, idx) => {
                            // Pre-fill first player of first category with user data if available
                            if (idx === 0 && category === categories[0] && user) {
                                return {
                                    fullName: user.name || "",
                                    email: user.email || "",
                                    phone: user.phone || "",
                                    age: "",
                                    gender: ""
                                };
                            }
                            return { ...emptyPlayer };
                        });
                    } else {
                        newIndividualPlayers[category] = prevIndividualPlayers[category];
                    }
                }
                return newIndividualPlayers;
            });
        }
    }, [registrationType, categories, user]);

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

        // Individual registration player validation (per category)
        if (registrationType === "individual" && step > categoryStep && step < confirmStep) {
            let currentStepIndex = categoryStep + 1;
            for (const category of categories) {
                const requiredPlayers = getRequiredPlayersForCategory(category);

                for (let playerIndex = 0; playerIndex < requiredPlayers; playerIndex++) {
                    if (step === currentStepIndex) {
                        const playerData = individualPlayers[category]?.[playerIndex];
                        if (playerData) {
                            const errs = validatePlayer(playerData);
                            const newErrors = { ...individualPlayerErrors };
                            if (!newErrors[category]) {
                                newErrors[category] = Array(requiredPlayers).fill(null).map(() => ({} as Partial<Record<keyof PlayerData, string>>));
                            }
                            newErrors[category][playerIndex] = errs;
                            setIndividualPlayerErrors(newErrors);

                            if (Object.keys(errs).length) {
                                return;
                            }
                        } else {
                            toast.error("Please fill in all required player details");
                            return;
                        }
                    }
                    currentStepIndex++;
                }
            }
        }

        // Team registration player validation
        if (registrationType === "team" && step > categoryStep && step < confirmStep) {
            let currentStepIndex = categoryStep + 1;
            for (const category of categories) {
                const requiredPlayers = getRequiredPlayersForCategory(category);

                for (let playerIndex = 0; playerIndex < requiredPlayers; playerIndex++) {
                    if (step === currentStepIndex) {
                        const playerData = teamPlayers[category]?.[playerIndex];
                        if (playerData) {
                            const errs = validateTeamPlayer(playerData);
                            const newErrors = { ...teamPlayerErrors };
                            if (!newErrors[category]) {
                                newErrors[category] = Array(requiredPlayers).fill(null).map(() => ({} as Partial<Record<keyof TeamPlayerData, string>>));
                            }
                            newErrors[category][playerIndex] = errs;
                            setTeamPlayerErrors(newErrors);

                            if (Object.keys(errs).length) {
                                return;
                            }
                        } else {
                            toast.error("Please fill in all required player details");
                            return;
                        }
                    }
                    currentStepIndex++;
                }
            }
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

        const isDirectRegistration = isTeamRegistration;
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

        // Prepare players data based on registration type
        let playersData: (PlayerData | TeamPlayerData)[];
        let firstPlayerData: PlayerData | null = null;
        
        if (registrationType === "team") {
            // Flatten team players data for backend
            playersData = [];
            for (const category of categories) {
                const categoryPlayers = teamPlayers[category] || [];
                // Only include players with valid data
                const validPlayers = categoryPlayers.filter(p => p && p.fullName && p.fullName.trim() && p.gender);
                playersData.push(...validPlayers);
            }
            
            if (playersData.length === 0) {
                toast.error("Please fill in all team player details");
                setIsPaying(false);
                return;
            }
        } else {
            // Individual registration - flatten players from all categories
            playersData = [];
            for (const category of categories) {
                const categoryPlayers = individualPlayers[category] || [];
                // Only include players with valid data
                const validPlayers = categoryPlayers.filter(p => p && p.fullName && p.fullName.trim() && p.email && p.phone && p.age && p.gender);
                playersData.push(...validPlayers);
                if (validPlayers.length > 0 && !firstPlayerData) {
                    firstPlayerData = validPlayers[0];
                }
            }
            
            if (playersData.length === 0) {
                toast.error("Please fill in all player details");
                setIsPaying(false);
                return;
            }
        }

        fetch("/api/sports/tournaments/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                registrationType,
                teamName: registrationType === "team" ? teamName.trim() : undefined,
                categories,
                players: playersData,
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
            .then((orderData: any) => {
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
                        } catch (error: any) {
                            const errorMessage = error instanceof Error ? error.message : "Payment verification failed";
                            toast.error(errorMessage);
                        } finally {
                            setIsPaying(false);
                        }
                    },
                    prefill: {
                        name: firstPlayerData ? firstPlayerData.fullName : "",
                        email: firstPlayerData ? firstPlayerData.email : "",
                        contact: firstPlayerData ? firstPlayerData.phone : "",
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
            .catch((error: any) => {
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
        setIndividualPlayers({});
        setChecks([false, false, false]);
        setP1Errors({});
        setP2Errors({});
        setIndividualPlayerErrors({});
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
                                            {confirmedRegistration.registrationType === "team" ? (
                                                (() => {
                                                    const categoryLabelsMap: Record<string, string> = {
                                                        mixed_doubles: "Mixed Doubles",
                                                        mens_doubles: "Men's Doubles",
                                                        womens_doubles: "Women's Doubles",
                                                    };
                                                    const getRequiredPlayers = (cat: string) => 2; // All categories require 2 players
                                                    
                                                    let playerIndex = 0;
                                                    return confirmedRegistration.categories.map((category: string) => {
                                                        const requiredPlayers = getRequiredPlayers(category);
                                                        const categoryLabel = categoryLabelsMap[category] || category;
                                                        const categoryPlayers = [];
                                                        
                                                        for (let i = 0; i < requiredPlayers; i++) {
                                                            if (playerIndex < confirmedRegistration.players.length) {
                                                                categoryPlayers.push(confirmedRegistration.players[playerIndex]);
                                                                playerIndex++;
                                                            }
                                                        }
                                                        
                                                        return (
                                                            <div key={category} className="space-y-2">
                                                                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">{categoryLabel}</p>
                                                                {categoryPlayers.map((player: PlayerData, idx: number) => (
                                                                    <div key={`${category}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 ml-4">
                                                                        <p className="text-sm font-black text-slate-900">
                                                                            {requiredPlayers === 1 ? 'Player' : `Player ${idx + 1}`}: {player.fullName}
                                                                        </p>
                                                                        <div className="mt-2 text-sm text-slate-600">
                                                                            <p>Gender: {player.gender === 'male' ? 'Male' : 'Female'}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    });
                                                })()
                                            ) : (
                                                confirmedRegistration.players.map((player: PlayerData, index: number) => (
                                                    <div key={`${player.email}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                        <p className="text-sm font-black text-slate-900">Player {index + 1}: {player.fullName}</p>
                                                        <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                                            <p>Email: {player.email}</p>
                                                            <p>Phone: {player.phone}</p>
                                                            <p>Age: {player.age}</p>
                                                            <p>Gender: {player.gender === 'male' ? 'Male' : 'Female'}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
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
                            <p className="mt-2 text-sm text-white/70">{isTeamRegistration ? `Fill out all steps carefully. Team registration is direct and no payment is collected.` : hasSelectedCategory ? `Fill out all steps carefully. Entry fee is ₹1,500 per player, with ${requiredPlayerCount} players required for this registration.` : `Choose your event type first to see the correct registration fee and player requirement.`}</p>
                        </div>
                        <CardContent className="p-6 md:p-8">
                            <StepIndicator currentStep={step} steps={stepLabels} />
                            <div className="mt-8 min-h-[320px]">
                                {step === 0 && <StepRegistrationType value={registrationType} onChange={setRegistrationType} />}
                                {registrationType === "team" && step === 1 && <StepTeamInfo teamName={teamName} onChange={setTeamName} error={teamNameError} />}
                                {step === categoryStep && <StepCategory registrationType={registrationType} selected={categories} onChange={setCategories} />}
                                
                                {/* Individual registration player details for each category */}
                                {registrationType === "individual" && step > categoryStep && step < confirmStep && (() => {
                                    let currentStepIndex = categoryStep + 1;

                                    for (const category of categories) {
                                        const requiredPlayers = getRequiredPlayersForCategory(category);
                                        const categoryLabel = categoryLabels[category];

                                        for (let playerIndex = 0; playerIndex < requiredPlayers; playerIndex++) {
                                            if (step === currentStepIndex) {
                                                const playerNumber = playerIndex + 1;
                                                const title = requiredPlayers === 1 ? `${categoryLabel} Player Details` : `${categoryLabel} - Player ${playerNumber} Details`;

                                                return (
                                                    <StepPlayerDetails
                                                        key={`${category}-${playerIndex}`}
                                                        title={title}
                                                        data={individualPlayers[category]?.[playerIndex] || { ...emptyPlayer }}
                                                        onChange={(data) => {
                                                            const newIndividualPlayers = { ...individualPlayers };
                                                            if (!newIndividualPlayers[category]) {
                                                                newIndividualPlayers[category] = Array(requiredPlayers).fill(null).map(() => ({ ...emptyPlayer }));
                                                            }
                                                            newIndividualPlayers[category][playerIndex] = data;
                                                            setIndividualPlayers(newIndividualPlayers);
                                                        }}
                                                        errors={individualPlayerErrors[category]?.[playerIndex] || {}}
                                                    />
                                                );
                                            }

                                            currentStepIndex++;
                                        }
                                    }

                                    return null;
                                })()}
                                
                                {/* Team registration player details for each category */}
                                {registrationType === "team" && step > categoryStep && step < confirmStep && (() => {
                                    let currentStepIndex = categoryStep + 1;

                                    for (const category of categories) {
                                        const requiredPlayers = getRequiredPlayersForCategory(category);

                                        for (let playerIndex = 0; playerIndex < requiredPlayers; playerIndex++) {
                                            if (step === currentStepIndex) {
                                                const playerNumber = playerIndex + 1;

                                                return (
                                                    <StepTeamPlayerDetails
                                                        key={`${category}-${playerIndex}`}
                                                        category={category}
                                                        playerNumber={playerNumber}
                                                        data={teamPlayers[category]?.[playerIndex] || { ...emptyTeamPlayer }}
                                                        onChange={(data) => {
                                                            const newTeamPlayers = { ...teamPlayers };
                                                            if (!newTeamPlayers[category]) {
                                                                newTeamPlayers[category] = Array(requiredPlayers).fill(null).map(() => ({ ...emptyTeamPlayer }));
                                                            }
                                                            newTeamPlayers[category][playerIndex] = data;
                                                            setTeamPlayers(newTeamPlayers);
                                                        }}
                                                        errors={teamPlayerErrors[category]?.[playerIndex] || {}}
                                                    />
                                                );
                                            }

                                            currentStepIndex++;
                                        }
                                    }

                                    return null;
                                })()}
                                
                                {step === confirmStep && (
                                    <StepConfirmation 
                                        checks={checks} 
                                        onChange={setChecks}
                                        registrationType={registrationType}
                                        uniquePlayerCount={pricingSummary.uniquePlayerCount}
                                        totalAmount={pricingSummary.totalAmount}
                                    />
                                )}
                            </div>

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