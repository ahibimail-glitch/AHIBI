"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  Ticket,
  DollarSign,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  createdAt: string;
}

interface Seat {
  _id: string;
  row: string;
  number: number;
  price: number;
  status: "available" | "selected" | "booked";
}

interface BookingResult {
  _id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  seats: Array<{
    id: string;
    price: number;
    category: string;
  }>;
  totalAmount: number;
  paymentStatus: string;
  paymentId: string;
  transactionId: string;
  bookedAt: string;
  status: string;
}


export default function AnnieManualBooking() {
  const [step, setStep] = useState<"customer" | "seats" | "confirm" | "success">("customer");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Fetch customers
  const fetchCustomers = async (search = "") => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/annie-musical/admin/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();
      setCustomers(data.customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  // Fetch seats
  const fetchSeats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/annie-musical/seats");
      
      if (!response.ok) {
        throw new Error("Failed to fetch seats");
      }

      const data = await response.json();
      setSeats(data);
    } catch (error) {
      console.error("Error fetching seats:", error);
      toast.error("Failed to fetch seats");
    } finally {
      setLoading(false);
    }
  };

  // Create manual booking
  const createManualBooking = async () => {
    if (!selectedCustomer || selectedSeats.length === 0) {
      toast.error("Please select customer and seats");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/annie-musical/admin/manual-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomer._id,
          seatIds: selectedSeats,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create booking");
      }

      const data = await response.json();
      setBookingResult(data.booking);
      setStep("success");
      toast.success("Manual booking created successfully!");
    } catch (error) {
      console.error("Error creating manual booking:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  // Generate invoice
  const generateInvoice = () => {
    if (!bookingResult) return;

    const invoiceContent = `
ANNIE MUSICAL - BOOKING INVOICE
================================

Booking ID: ${bookingResult._id}
Date: ${new Date(bookingResult.bookedAt).toLocaleDateString()}

CUSTOMER DETAILS:
Name: ${bookingResult.customer.name}
Email: ${bookingResult.customer.email}
Phone: ${bookingResult.customer.phone}

SEAT DETAILS:
${bookingResult.seats.map(seat => `${seat.id} (${seat.category}) - ₹${seat.price}`).join('\n')}

PAYMENT DETAILS:
Total Amount: ₹${bookingResult.totalAmount}
Payment Status: ${bookingResult.paymentStatus}
Payment ID: ${bookingResult.paymentId}
Transaction ID: ${bookingResult.transactionId}

Thank you for your booking!
    `;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annie-musical-invoice-${bookingResult._id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Invoice downloaded successfully!");
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (step === "seats") {
      fetchSeats();
    }
  }, [step]);

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSeatClick = (seatId: string, seatStatus: string) => {
    if (seatStatus !== "available") return;

    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  const getSeatDisplay = (seat: Seat) => {
    const isSelected = selectedSeats.includes(seat._id);
    let className = "w-7 h-7 m-0.5 rounded text-xs font-bold cursor-pointer transition-all duration-200 flex items-center justify-center border ";
    
    if (seat.status === "booked") {
      className += "bg-gray-400 text-gray-600 cursor-not-allowed border-gray-300";
    } else if (seat.status === "selected") {
      className += "bg-yellow-500 text-white cursor-not-allowed border-yellow-600";
    } else if (isSelected) {
      className += "bg-red-500 text-white shadow-lg border-red-600";
    } else {
      className += "bg-green-500 text-white hover:bg-green-600 border-green-600";
    }

    return (
      <div
        key={seat._id}
        className={className}
        onClick={() => handleSeatClick(seat._id, seat.status)}
        title={`${seat.row}${seat.number} - ₹${seat.price} (${seat.status})`}
      >
        {seat.number}
      </div>
    );
  };

  // Split seats into left and right sections for aisle (from SeatingChart logic)
  const createRowWithAisle = (seats: Seat[]) => {
    const reversed = [...seats].reverse();
    const totalSeats = reversed.length;
    const leftCount = Math.floor(totalSeats / 2);

    return {
      left: reversed.slice(0, leftCount),
      right: reversed.slice(leftCount)
    };
  };

  const renderSeatingChart = () => {
    // Organize seats by rows (dynamic approach from SeatingChart)
    const seatsByRow: { [key: string]: Seat[] } = {};
    seats.forEach(seat => {
      if (!seatsByRow[seat.row]) {
        seatsByRow[seat.row] = [];
      }
      seatsByRow[seat.row].push(seat);
    });

    // Sort seats within each row by number
    Object.keys(seatsByRow).forEach(rowId => {
      seatsByRow[rowId].sort((a, b) => a.number - b.number);
    });

    // Sort rows with X at bottom, others reverse alphabetically (from SeatingChart)
    const rows = Object.entries(seatsByRow).sort(([rowA], [rowB]) => {
      if (rowA === 'X') return 1;
      if (rowB === 'X') return -1;
      return rowB.localeCompare(rowA);
    });

    return (
      <div className="bg-white p-6 rounded-lg">
        {/* Theater seating chart */}
        <div className="space-y-1">
          {rows.map(([rowId, rowSeats]) => {
            const { left, right } = createRowWithAisle(rowSeats);
            const rowPrice = rowSeats[0]?.price; // Get price from actual seat data
            
            return (
              <div key={rowId} className="flex items-center justify-center">
                {/* Row label with price */}
                <div className="w-12 flex flex-col items-center justify-center mr-4 text-xs">
                  <div className="font-bold text-gray-800">{rowId}</div>
                  <div className="text-gray-600">₹{rowPrice}</div>
                </div>
                
                {/* Left section seats */}
                <div className="flex gap-0.5 mr-8">
                  {left.map(seat => getSeatDisplay(seat))}
                </div>
                
                {/* Center Aisle */}
                <div className="w-6 flex justify-center">
                  <div className="w-0.5 h-7 bg-gradient-to-b from-slate-300 to-slate-400 opacity-60 rounded-full" />
                </div>
                
                {/* Right section seats */}
                <div className="flex gap-0.5">
                  {right.map(seat => getSeatDisplay(seat))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stage */}
        <div className="text-center mt-8 mb-6">
          <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-black px-12 py-2.5 font-bold text-sm rounded-lg shadow-lg border-2 border-yellow-500">
            🎭 SCREEN / STAGE
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 mt-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded border border-green-600"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded border border-red-600"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded border border-yellow-600"></div>
            <span>Reserved</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 rounded border border-gray-300"></div>
            <span>Booked</span>
          </div>
        </div>
      </div>
    );
  };

  const getTotalAmount = () => {
    return selectedSeats.reduce((total, seatId) => {
      const seat = seats.find(s => s._id === seatId);
      return total + (seat?.price || 0);
    }, 0);
  };

  if (step === "customer") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Select Customer</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customers.map((customer) => (
                  <Card
                    key={customer._id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedCustomer?._id === customer._id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{customer.name}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{customer.city}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedCustomer && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button onClick={() => setStep("seats")} className="bg-blue-600 hover:bg-blue-700">
                  Next: Select Seats
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "seats") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ticket className="h-5 w-5" />
                <span>Select Seats</span>
              </div>
              <Badge variant="outline">
                Customer: {selectedCustomer?.name}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {renderSeatingChart()}
                
                {selectedSeats.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium mb-2">Selected Seats:</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedSeats.map(seatId => {
                        const seat = seats.find(s => s._id === seatId);
                        return seat ? (
                          <Badge key={seatId} variant="secondary">
                            {seat.row}{seat.number} - ₹{seat.price}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-lg">
                        Total: ₹{getTotalAmount()}
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" onClick={() => setStep("customer")}>
                          Back
                        </Button>
                        <Button onClick={() => setStep("confirm")} className="bg-green-600 hover:bg-green-700">
                          Confirm Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Confirm Booking</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Customer Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedCustomer?.name}</div>
                  <div><strong>Email:</strong> {selectedCustomer?.email}</div>
                  <div><strong>Phone:</strong> {selectedCustomer?.phone}</div>
                  <div><strong>City:</strong> {selectedCustomer?.city}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Booking Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Seats:</strong> {selectedSeats.length}</div>
                  <div><strong>Total Amount:</strong> ₹{getTotalAmount()}</div>
                  <div><strong>Payment:</strong> Manual (Admin)</div>
                  <div><strong>Status:</strong> Confirmed</div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">Selected Seats</h3>
              <div className="flex flex-wrap gap-2">
                {selectedSeats.map(seatId => {
                  const seat = seats.find(s => s._id === seatId);
                  return seat ? (
                    <Badge key={seatId} variant="secondary">
                      {seat.row}{seat.number} - ₹{seat.price}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep("seats")}>
                Back
              </Button>
              <Button 
                onClick={createManualBooking} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success" && bookingResult) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Booking Created Successfully!</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  Booking ID: {bookingResult._id}
                </div>
                <div className="text-gray-600">
                  Created on {new Date(bookingResult.bookedAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Customer Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {bookingResult.customer.name}</div>
                  <div><strong>Email:</strong> {bookingResult.customer.email}</div>
                  <div><strong>Phone:</strong> {bookingResult.customer.phone}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Payment Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Total Amount:</strong> ₹{bookingResult.totalAmount}</div>
                  <div><strong>Payment Status:</strong> {bookingResult.paymentStatus}</div>
                  <div><strong>Payment ID:</strong> {bookingResult.paymentId}</div>
                  <div><strong>Transaction ID:</strong> {bookingResult.transactionId}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Seats Booked</h3>
              <div className="flex flex-wrap gap-2">
                {bookingResult.seats.map((seat, index) => (
                  <Badge key={index} variant="secondary">
                    {seat.id} ({seat.category}) - ₹{seat.price}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={generateInvoice} variant="outline" className="bg-green-600 hover:bg-green-700 text-white">
                {/* <FileText className="mr-2 h-4 w-4" /> */}
                INVOICE WILL BE AVAILABLE IN
                 THE USER DASHBOARD
              </Button>
              <Button 
                onClick={() => {
                  setStep("customer");
                  setSelectedCustomer(null);
                  setSelectedSeats([]);
                  setBookingResult(null);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Another Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
