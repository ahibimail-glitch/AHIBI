"use client";

import type React from "react";

import { useEffect, useRef, useState, Suspense } from "react";
import Script from "next/script";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { getSafeRedirectUrl } from "@/utils/redirectUtils";

declare global {
  interface Window {
    google?: any;
  }
}

type AuthView = "choice" | "phone" | "signup" | "otp";
type PhoneFlow = "login" | "signup";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirectUrl(searchParams.get("redirect"));
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const [view, setView] = useState<AuthView>("choice");
  const [flow, setFlow] = useState<PhoneFlow>("login");
  const [phone, setPhone] = useState("");
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    city: "",
    agreeToTerms: false,
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const persistTokenAndRedirect = (token: string) => {
    localStorage.setItem("token", token);
    if (rememberMe) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      localStorage.setItem("tokenExpiry", expiryDate.toISOString());
    }
    window.location.href = redirectUrl;
  };

  const resetMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const sendPhoneOtp = async (currentFlow: PhoneFlow) => {
    const body = currentFlow === "login"
      ? { phone, mode: "login" }
      : {
          phone,
          mode: "signup",
          name: signupData.name,
          email: signupData.email,
          city: signupData.city,
        };

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to send OTP");
    }

    setSuccessMessage(
      currentFlow === "login"
        ? "OTP sent successfully. Check your email."
        : `OTP sent successfully to ${signupData.email}.`
    );
  };

  const handlePhoneContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const trimmedPhone = phone.trim();
    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone }),
      });

      if (res.ok) {
        setFlow("login");
        await sendPhoneOtp("login");
        setView("otp");
      } else if (res.status === 404) {
        setFlow("signup");
        setView("signup");
      } else {
        const data = await res.json();
        throw new Error(data.message || "Unable to continue");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!signupData.name || !signupData.email || !signupData.city) {
      setError("Please complete all required fields.");
      return;
    }

    if (!signupData.agreeToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      await sendPhoneOtp("signup");
      setView("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const payload = flow === "signup"
        ? {
            phone,
            otp,
            name: signupData.name,
            email: signupData.email,
            city: signupData.city,
          }
        : { phone, otp };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP");
      }

      persistTokenAndRedirect(data.data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    resetMessages();
    setGoogleLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Google authentication failed");
      }

      persistTokenAndRedirect(data.data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleScriptReady || !googleClientId || !window.google || !googleButtonRef.current) {
      return;
    }

    googleButtonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          void handleGoogleCredential(response.credential);
        }
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with",
      shape: "pill",
    });
  }, [googleScriptReady, googleClientId]);

  const title = "Sign In to Ahibi";

  const description = "";

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptReady(true)}
      />

      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#0F172A]">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <img
                src="/images/Logo.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription className="text-white/80">{description}</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-md p-3 mb-4">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="text-green-400 text-sm bg-green-900/20 border border-green-700 rounded-md p-3 mb-4">
                {successMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-center">
                {googleLoading ? (
                  <Button disabled className="w-full">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating with Google...
                  </Button>
                ) : googleClientId ? (
                  <div ref={googleButtonRef} className="flex justify-center w-full" />
                ) : (
                  <div className="w-full text-sm text-amber-300 bg-amber-900/20 border border-amber-700 rounded-md p-3 text-center">
                    Google sign-in is not configured. Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
                  </div>
                )}
              </div>

              {/* <div className="text-center text-sm text-white/60">
                Phone OTP login is temporarily hidden.
              </div> */}
            </div>

            <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
              <Shield className="h-4 w-4 mr-1" />
              Secured with Phone OTP or Google authentication
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#0F172A]">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <img
                src="/images/Logo.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-white">Loading...</CardTitle>
            <CardDescription className="text-white/80">
              Please wait while we load the authentication page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}

