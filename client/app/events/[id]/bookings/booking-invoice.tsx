import React, { useState } from 'react';
import { FileText, Calendar, Clock, Users, MapPin, CreditCard, Download, QrCode, Share2, Star, Ticket } from 'lucide-react';

interface UserProfile {
    name: string;
    email: string;
    phone: string;
    bio: string;
    interests: string[];
    [key: string]: any;
}

const ModernBookingTicket = () => {
    const [booking, setBooking] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);

    React.useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError("");
            try {
                // Simulated data for demo
                setUser({
                    name: "John Doe",
                    email: "john.doe@example.com",
                    phone: "+91 98765 43210",
                    bio: "",
                    interests: []
                });
            } catch (e) {
                setError("Network error. Please try again.");
            }
        };

        const fetchBookings = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Simulated booking data for demo
                const mockBooking = {
                    _id: "BK001234567890",
                    user: {
                        username: "john_doe",
                        name: "John Doe",
                        email: "john.doe@example.com",
                        phone: "+91 98765 43210"
                    },
                    court: {
                        name: "Premium Sports Arena",
                        location: "Sector 18, Noida, Delhi NCR",
                        type: "Badminton Court",
                        amenities: ["Air Conditioned", "Premium Lighting", "Wooden Flooring"]
                    },
                    courtBy: "SportsPlex Management",
                    startTime: new Date("2024-07-25T18:00:00"),
                    endTime: new Date("2024-07-25T20:00:00"),
                    players: 4,
                    totalAmount: 1200,
                    createdAt: new Date("2024-07-23T10:30:00"),
                    notes: "Birthday celebration booking",
                    timeSlots: [
                        { startTime: "6:00 PM", endTime: "7:00 PM", price: 600 },
                        { startTime: "7:00 PM", endTime: "8:00 PM", price: 600 }
                    ],
                    payment: {
                        method: "UPI",
                        transactionId: "TXN789456123",
                        paidAt: new Date("2024-07-23T10:32:00"),
                        status: "SUCCESS"
                    },
                    bookingCode: "SPX2024072501",
                    venue: {
                        rating: 4.8,
                        reviews: 1250
                    }
                };
                
                setBooking(mockBooking);
                setTimeout(() => setLoading(false), 1000);
            } catch (err: any) {
                setError(err.message || 'Failed to load booking.');
                setLoading(false);
            }
        };

        fetchProfile();
        fetchBookings();
    }, []);

    const formatDate = (date: string | number | Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date: string | number | Date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const handleDownload = () => {
        const ticketElement = document.getElementById('booking-ticket');
        if (!ticketElement) return;

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const ticketHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking Ticket - ${booking.bookingCode}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
                    .ticket { max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .gradient-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; color: white; }
                    .ticket-info { padding: 24px; }
                    .dashed-border { border-top: 2px dashed #e2e8f0; margin: 16px 0; }
                    .qr-placeholder { width: 80px; height: 80px; background: #f1f5f9; border: 2px solid #cbd5e1; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #64748b; }
                    @media print {
                        body { background: white; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${ticketElement.outerHTML}
            </body>
            </html>
        `;

        printWindow.document.write(ticketHTML);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Sports Booking - ${booking.court.name}`,
                text: `I've booked ${booking.court.name} for ${formatDate(booking.startTime)}`,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(`Booking Confirmed! ${booking.court.name} on ${formatDate(booking.startTime)} - Code: ${booking.bookingCode}`);
            alert('Booking details copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center p-10">
                <span className="text-red-500">{error}</span>
            </div>
        );
    }

    if (!booking) {
        return null;
    }

    return (
        <div className="max-w-sm mx-auto">
            <div id="booking-ticket" className="bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-105">
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <Ticket className="w-6 h-6 text-white mr-2" />
                                <span className="text-white font-bold text-lg">BOOKING CONFIRMED</span>
                            </div>
                            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                                <span className="text-white text-xs font-semibold">PAID</span>
                            </div>
                        </div>
                        
                        <h1 className="text-white text-xl font-bold mb-2">{booking.court.name}</h1>
                        <div className="flex items-center text-white text-opacity-90 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{booking.court.location}</span>
                        </div>
                        
                        {/* {booking.venue && (
                            <div className="flex items-center mt-2 text-white text-opacity-90 text-sm">
                                <Star className="w-4 h-4 mr-1 fill-current" />
                                <span>{booking.venue.rating} • {booking.venue.reviews} reviews</span>
                            </div>
                        )} */}
                    </div>
                </div>

                {/* Ticket Body */}
                <div className="px-6 py-6">
                    {/* Date and Time Highlight */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                                <p className="text-sm font-bold text-gray-900">{formatDate(booking.startTime)}</p>
                            </div>
                            <div className="text-center">
                                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                                <p className="text-sm font-bold text-gray-900">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Booking Code</span>
                            <span className="font-mono text-sm font-bold text-blue-600">{booking.bookingCode}</span>
                        </div>
                        
                        
                        
    

            
                    </div>

                  
                    {/* Dashed Separator */}
                    <div className="border-t-2 border-dashed border-gray-200 my-6 relative">
                        <div className="absolute left-0 top-0 w-6 h-6 bg-gray-100 rounded-full -ml-3 -mt-3"></div>
                        <div className="absolute right-0 top-0 w-6 h-6 bg-gray-100 rounded-full -mr-3 -mt-3"></div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6 text-blue-600">
                        <h3 className="text-sm font-semibold mb-3">Customer Details</h3>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <p className="text-sm font-medium">{booking.user?.name || user?.name}</p>
                            <p className="text-xs">{booking.user?.email || user?.email}</p>
                            <p className="text-xs">{booking.user?.phone || user?.phone}</p>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-lg font-bold text-gray-900">Total Amount</span>
                            <span className="text-2xl font-bold text-green-600">{formatCurrency(booking.totalAmount)}</span>
                        </div>
                        
                        {booking.payment && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <CreditCard className="w-4 h-4 text-green-600 mr-2" />
                                        <span className="text-sm font-medium text-green-800">Payment Successful</span>
                                    </div>
                                    <span className="text-xs font-mono text-green-700">{booking.payment.transactionId}</span>
                                </div>
                                <p className="text-xs text-green-700 mt-1">
                                    {booking.payment.method} • Paid on {formatDate(booking.payment.paidAt)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* QR Code Placeholder
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto flex items-center justify-center mb-2">
                            <QrCode className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500">Scan QR code at venue</p>
                    </div> */}
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 bg-gray-50 border-t">
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownload}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Ticket
                        </button>
                        <button
                            onClick={handleShare}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="text-center mt-4">
                        <p className="text-xs text-gray-500">Generated on {formatDate(new Date())}</p>
                        <p className="text-xs text-gray-400 mt-1">Show this ticket at the venue</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModernBookingTicket;