"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, Clock, MapPin, Users, IndianRupee, Download, XCircle, Loader2, Phone, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl } from "@/config";

interface Booking {
  _id: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  numberOfPlayers: number;
  status: string;
  contactDetails: {
    name: string;
    phone: string;
    email: string;
  };
  specialRequests: string;
  pricing: {
    baseAmount: number;
    equipmentRental: number;
    coachingFee: number;
    taxes: number;
    platformFee: number;
    discount: number;
    totalAmount: number;
  };
  payment: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paymentStatus: string;
    paidAt: Date;
  };
  venue: {
    _id: string;
    venueName: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
    contactInfo: {
      phone: string;
      email: string;
    };
  };
  court: {
    _id: string;
    courtName: string;
    sportType: string;
  };
  invoiceNumber: string;
  createdAt: Date;
  confirmedAt: Date;
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const bookingId = params.id as string;
  const isSuccess = searchParams.get("success") === "true";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
      if (!user) {
        router.push(`/auth?redirect=/sports/bookings/${bookingId}`);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`/sports/bookings/${bookingId}`), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setBooking(data.data.booking);
        } else {
          setError(data.message || "Failed to load booking details");
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchBooking();
    }
  }, [bookingId, user, authLoading, router]);

  const handleDownloadInvoice = () => {
    if (!booking) return;

    const invoiceContent = `
AHIBI SPORTS - BOOKING INVOICE
================================

Invoice Number: ${booking.invoiceNumber}
Booking ID: ${booking._id}
Date: ${new Date(booking.createdAt).toLocaleDateString()}

CUSTOMER DETAILS
----------------
Name: ${booking.contactDetails.name}
Phone: ${booking.contactDetails.phone}
Email: ${booking.contactDetails.email || "N/A"}

BOOKING DETAILS
---------------
Venue: ${booking.venue.venueName}
Court: ${booking.court.courtName}
Sport: ${booking.court.sportType.toUpperCase()}
Date: ${new Date(booking.bookingDate).toLocaleDateString()}
Time: ${booking.startTime} - ${booking.endTime}
Duration: ${booking.duration} minutes
Players: ${booking.numberOfPlayers}

PAYMENT DETAILS
---------------
Court Charges: ₹${booking.pricing.baseAmount}
Platform Fee: ₹${booking.pricing.platformFee}
GST (18%): ₹${booking.pricing.taxes}
Total Amount: ₹${booking.pricing.totalAmount}

Payment ID: ${booking.payment.razorpayPaymentId}
Payment Status: ${booking.payment.paymentStatus.toUpperCase()}
Paid At: ${new Date(booking.payment.paidAt).toLocaleString()}

VENUE ADDRESS
-------------
${booking.venue.address.street}
${booking.venue.address.city}, ${booking.venue.address.state} - ${booking.venue.address.pincode}

Contact: ${booking.venue.contactInfo.phone}
Email: ${booking.venue.contactInfo.email}

================================
Thank you for booking with AHIBI Sports!
    `;

    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AHIBI-Invoice-${booking.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The booking you're looking for doesn't exist."}</p>
          <button
            onClick={() => router.push("/sports")}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Back to Sports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Banner */}
        {isSuccess && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">
              Your court has been successfully booked. Check your email and SMS for confirmation details.
            </p>
          </div>
        )}

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Booking Details</h2>
              <p className="text-sm text-gray-600">Invoice: {booking.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <div
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                  booking.status === "confirmed"
                    ? "bg-green-100 text-green-700"
                    : booking.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {booking.status.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Venue & Court Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Venue</p>
                <p className="text-lg font-semibold text-gray-800">{booking.venue.venueName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Court</p>
                <p className="text-lg font-semibold text-gray-800">{booking.court.courtName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Sport</p>
                <p className="text-lg font-semibold text-gray-800">
                  {booking.court.sportType.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(booking.bookingDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {booking.startTime} - {booking.endTime}
                  </p>
                  <p className="text-sm text-gray-600">{booking.duration} minutes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Players</p>
                  <p className="text-lg font-semibold text-gray-800">{booking.numberOfPlayers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="border-t pt-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold text-gray-800">{booking.contactDetails.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-800">{booking.contactDetails.phone}</p>
                </div>
              </div>
              {booking.contactDetails.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-800">{booking.contactDetails.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="border-t pt-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Special Requests</h3>
              <p className="text-gray-700">{booking.specialRequests}</p>
            </div>
          )}

          {/* Payment Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-700">
                <span>Court Charges</span>
                <span>₹{booking.pricing.baseAmount}</span>
              </div>
              {booking.pricing.equipmentRental > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Equipment Rental</span>
                  <span>₹{booking.pricing.equipmentRental}</span>
                </div>
              )}
              {booking.pricing.coachingFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Coaching Fee</span>
                  <span>₹{booking.pricing.coachingFee}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Platform Fee</span>
                <span>₹{booking.pricing.platformFee}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>GST (18%)</span>
                <span>₹{booking.pricing.taxes}</span>
              </div>
              {booking.pricing.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{booking.pricing.discount}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-800">
                <span>Total Amount</span>
                <span>₹{booking.pricing.totalAmount}</span>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Payment Successful</span>
              </div>
              <p className="text-sm text-gray-700">
                Payment ID: {booking.payment.razorpayPaymentId}
              </p>
              <p className="text-sm text-gray-700">
                Paid on: {new Date(booking.payment.paidAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Venue Location */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Venue Location
          </h3>
          <div className="space-y-2">
            <p className="text-gray-700">{booking.venue.address.street}</p>
            <p className="text-gray-700">
              {booking.venue.address.city}, {booking.venue.address.state} -{" "}
              {booking.venue.address.pincode}
            </p>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-orange-500" />
                <span>{booking.venue.contactInfo.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-orange-500" />
                <span>{booking.venue.contactInfo.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDownloadInvoice}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Invoice
          </button>
          <button
            onClick={() => router.push("/sports/my-bookings")}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View All Bookings
          </button>
          <button
            onClick={() => router.push("/sports")}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Book Another Court
          </button>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-blue-900 mb-2">Important Notes:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Please arrive 10 minutes before your booking time</li>
            <li>Carry a valid ID proof for verification</li>
            <li>Show this booking confirmation at the venue reception</li>
            <li>Cancellations must be made at least 24 hours in advance for full refund</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
