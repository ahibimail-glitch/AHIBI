"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Loader2,
  Calendar,
  MapPin,
  IndianRupee,
  Clock,
  User,
  CheckCircle2,
} from "lucide-react";

interface Message {
  sender: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface Booking {
  _id: string;
  artist: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  organizer?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  customer?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  event: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: {
      name: string;
      address: string;
    };
  };
  booking: {
    status: string;
    requestedAmount: number;
    finalAmount?: number;
  };
  communication: {
    messages: Message[];
    counterOffer?: {
      amount: number;
      message: string;
      timestamp: string;
    };
  };
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showFinalPriceModal, setShowFinalPriceModal] = useState(false);
  const [finalPrice, setFinalPrice] = useState("");

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [booking?.communication.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("artist_token");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/artist/bookings/${bookingId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setBooking(response.data.data.booking);
      } else {
        setError(response.data.message || "Failed to fetch booking details");
      }
    } catch (err: any) {
      console.error("Error fetching booking details:", err);
      setError(err.response?.data?.message || "Failed to fetch booking details");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      setSending(true);
      const token = localStorage.getItem("artist_token");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/artist/bookings/${bookingId}/message`,
        { message },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setMessage("");
        fetchBookingDetails();
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const setFinalPriceAction = async () => {
    if (!finalPrice || isNaN(Number(finalPrice))) {
      alert("Please enter a valid final price");
      return;
    }

    try {
      setSending(true);
      const token = localStorage.getItem("artist_token");
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/artist/bookings/${bookingId}/final-price`,
        { finalAmount: Number(finalPrice), message: "Final price confirmed" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setShowFinalPriceModal(false);
        setFinalPrice("");
        fetchBookingDetails();
      }
    } catch (err: any) {
      console.error("Error setting final price:", err);
      setError(err.response?.data?.message || "Failed to set final price");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">{error || "Booking not found"}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSetFinalPrice = ['pending', 'accepted', 'counter_offered'].includes(booking.booking.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">Chat with {(booking.organizer?.name || booking.customer?.name || "Customer")}</CardTitle>
                  <p className="text-muted-foreground mt-1">{booking.event.name}</p>
                </div>
                <Badge
                  variant={
                    booking.booking.status === "accepted" ||
                    booking.booking.status === "confirmed"
                      ? "default"
                      : booking.booking.status === "pending"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {booking.booking.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(booking.event.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.event.startTime} - {booking.event.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="line-clamp-1">{booking.event.venue.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {booking.booking.finalAmount
                      ? booking.booking.finalAmount.toLocaleString()
                      : booking.booking.requestedAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Final Price Button */}
        {canSetFinalPrice && (
          <Card className="mb-4 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900">Ready to finalize the booking?</p>
                  <p className="text-sm text-green-800">
                    Set the final price to confirm the booking with {(booking.organizer?.name || booking.customer?.name || "Customer")}
                  </p>
                </div>
                <Button
                  onClick={() => setShowFinalPriceModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Set Final Price
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final Price Modal */}
        {showFinalPriceModal && (
          <Card className="mb-4 border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-purple-900">Final Price (₹)</label>
                  <Input
                    type="number"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    placeholder="Enter final price"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={setFinalPriceAction}
                    disabled={sending || !finalPrice}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirm Final Price"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFinalPriceModal(false);
                      setFinalPrice("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Messages */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {booking.communication.messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                booking.communication.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.sender === "artist" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender === "artist"
                          ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-semibold">
                          {msg.sender === "artist" ? "You" : (booking.organizer?.name || booking.customer?.name || "Customer")}
                        </span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Message Input */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                className="bg-gradient-to-r from-pink-600 to-purple-600"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
