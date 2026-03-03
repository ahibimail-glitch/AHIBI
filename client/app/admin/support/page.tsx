"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SupportTickets from "../components/SupportTickets";

export default function AdminSupportPage() {
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_token");
      const adminId = localStorage.getItem("admin_id");

      if (!token || !adminId) {
        // Clear any partial/invalid auth data
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_id");
        router.replace("/admin/login");
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push("/admin")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Support Tickets</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-full text-sm items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                System Healthy
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 md:p-8">
        <SupportTickets />
      </main>
    </div>
  );
}
