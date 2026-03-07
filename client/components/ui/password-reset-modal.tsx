"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Phone, Lock } from "lucide-react";

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
}

export function PasswordResetModal({
  isOpen,
  onClose,
  phone,
}: PasswordResetModalProps) {
  const [step, setStep] = useState<"phone" | "otp" | "newPassword">("phone");
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      setError("Please enter a valid 10-digit phone number");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to send OTP");
        setLoading(false);
        return;
      }

      setSuccessMessage("OTP sent successfully! Check your email.");
      setStep("otp");
      setLoading(false);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: phoneNumber, 
          otp, 
          newPassword 
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccessMessage("Password reset successfully! You can now login with your new password.");
      setStep("newPassword");
      setLoading(false);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("phone");
    setPhoneNumber(phone);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#0F172A] border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {step === "phone" && "Forgot Password"}
            {step === "otp" && "Verify OTP"}
            {step === "newPassword" && "Password Reset Success"}
          </DialogTitle>
          <DialogDescription className="text-white/80">
            {step === "phone" && "Enter your phone number to receive a password reset OTP on your email"}
            {step === "otp" && "We've sent a 6-digit code to your email"}
            {step === "newPassword" && "Your password has been reset successfully"}
          </DialogDescription>
        </DialogHeader>
        
        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetPhone" className="text-white">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="resetPhone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                  required
                  maxLength={10}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-md p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetOtp" className="text-white">
                Enter OTP
              </Label>
              <Input
                id="resetOtp"
                type="text"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 bg-gray-800 border-gray-600 text-white"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword" className="text-white">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 bg-gray-800 border-gray-600 text-white"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("phone")}
                disabled={loading}
                className="flex-1 border-gray-600 text-black hover:bg-white-700"
              >
                ← Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !otp || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="flex-1"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        )}

        {step === "newPassword" && (
          <div className="space-y-4">
            <div className="text-green-400 text-sm bg-green-900/20 border border-green-700 rounded-md p-3 text-center">
              {successMessage}
            </div>
            <Button
              onClick={handleClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
