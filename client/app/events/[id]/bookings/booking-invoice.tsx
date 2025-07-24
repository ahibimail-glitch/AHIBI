import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Clock, Users, MapPin, CreditCard, Download, QrCode, Share2, Star, Ticket, XCircle } from 'lucide-react';

interface UserProfile {
    name: string;
    email: string;
    phone: string;
    bio: string;
    interests: string[];
    [key: string]: any; // Allow other properties
}

interface ModernBookingTicketProps {
    bookingId: string;
}

const ModernBookingTicket: React.FC<ModernBookingTicketProps> = ({ bookingId }) => {
    const [booking, setBooking] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const fetchBookingAndProfileData = async () => {
            if (!bookingId) return;

            setLoading(true);
            setError("");

            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setError("Authentication token not found. Please log in.");
                    setLoading(false);
                    return;
                }

                // Fetch booking details
                const bookingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${bookingId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    }
                });

                if (!bookingRes.ok) {
                    const errorData = await bookingRes.json();
                    throw new Error(errorData.message || 'Failed to fetch booking details.');
                }

                const bookingData = await bookingRes.json();
                setBooking(bookingData.data);

                // Fetch user profile (can be redundant if booking populates user, but good for consistency)
                const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    }
                });

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setUser(profileData.data.user);
                } else {
                    console.warn("Could not fetch user profile, will rely on booking data.");
                }

            } catch (err: any) {
                setError(err.message || 'An unknown error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchBookingAndProfileData();
    }, [bookingId]);

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
        // This function would ideally use a library like html2canvas and jspdf to generate a PDF
        alert("Download functionality not implemented in this demo.");
    };

    const handleShare = () => {
        // if (navigator.share) {
        //     navigator.share({
        //         title: `Sports Booking - ${booking.court.name}`,
        //         text: `I've booked ${booking.court.name} for ${formatDate(booking.startTime)}`,
        //         url: window.location.href
        //     });
        // } else {
        //     navigator.clipboard.writeText(`Booking Confirmed! ${booking.court.name} on ${formatDate(booking.startTime)} - Code: ${booking.bookingCode}`);
        //     alert('Booking details copied to clipboard!');
        // }
    };

    // --- Loading and Error States ---
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold text-gray-700">Loading Your Booking...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-red-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                    <p className="mt-4 text-lg font-semibold text-red-700">Error</p>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return null; // Or a 'not found' state
    }

    // --- QR Code URL Generation ---
    let qrUrl = '';
    let qrDebug = '';
    let rawData = '';
    
    if (booking) {
        try {
            // Create a simpler verification data object (avoid Date objects which can cause issues)
            const verificationData = {
                bookingId: booking._id,
                bookingCode: booking.bookingCode,
                date: formatDate(booking.startTime),
                time: formatTime(booking.startTime),
                name: booking.user?.name || user?.name
            };
            
            // Simple text for QR code - much more reliable than complex JSON
            const rawDataObject = {
                bookingId: booking._id,
                bookingCode: booking.bookingCode,
                bookingDate: formatDate(booking.bookedAt),
                name: booking.user?.name || user?.name,
                email: booking.user?.email || user?.email,
                phone: booking.user?.phone || user?.phone,
                event: booking.event?.title,
                ticketType: booking.ticketType,
                quantity: booking.quantity,
                total: formatCurrency(booking.total)
            };
            rawData = JSON.stringify(rawDataObject);
            
            // Use QR Server - more reliable alternative
            // We'll use a simple text content rather than complex JSON
            qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(rawData)}&size=200x200&margin=10`;
            
            // Create debug info
            qrDebug = `Using QR Server API: ${rawData.substring(0, 50)}...`;
        } catch (err: any) { // Type assertion to fix TypeScript error
            console.error('Error generating QR code:', err);
            qrDebug = `Error: ${err?.message || 'Unknown error'}`;
        }
    }

    return (
        <div className="max-w-sm mx-auto my-10 p-4">
            <div id="booking-ticket" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
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
                        {/* <h1 className="text-white text-xl font-bold mb-2">{booking.court.name}</h1> */}
                        <div className="flex items-center text-white text-opacity-90 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            {/* <span>{booking.court.location}</span> */}
                        </div>
                    </div>
                </div>

                {/* Ticket Body */}
                <div className="px-6 py-6">
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

                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Booking Code</span>
                            <span className="font-mono text-sm font-bold text-blue-600">{booking.bookingCode}</span>
                        </div>
                    </div>

                    <div className="border-t-2 border-dashed border-gray-200 my-6 relative">
                        <div className="absolute left-0 top-0 w-6 h-6 bg-gray-100 rounded-full -ml-3 -mt-3"></div>
                        <div className="absolute right-0 top-0 w-6 h-6 bg-gray-100 rounded-full -mr-3 -mt-3"></div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-3 text-gray-800">Customer Details</h3>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                            <p className="font-medium text-gray-900">{booking.user?.name || user?.name}</p>
                            <p className="text-gray-600">{booking.user?.email || user?.email}</p>
                            <p className="text-gray-600">{booking.user?.phone || user?.phone}</p>
                        </div>
                    </div>

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
                            </div>
                        )}
                    </div>

                    {/* QR Code for Venue Verification */}
                    <div className="text-center mb-6">
                        {qrUrl ? (
                            <div className="flex flex-col items-center">
                                <div className="border-4 border-blue-100 rounded-lg p-4 bg-white inline-block">
                                    {/* QR code image with fallbacks */}
                                    <img 
                                        src={qrUrl} 
                                        alt="Booking QR Code" 
                                        width={200} 
                                        height={200} 
                                        className="mx-auto"
                                        loading="eager"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            console.error('QR image failed to load');
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                                <div className="mt-3 space-y-1">
                                    <p className="text-sm font-medium text-blue-700">Venue Entry Pass</p>
                                    <p className="text-xs text-gray-500">Scan this QR code at the venue entrance</p>
                                    <p className="text-xs text-gray-400">{booking.bookingCode}</p>
                                </div>
                                
                                {/* Backup text data for manual entry if QR fails */}
                                <div className="mt-4 border-t pt-3 border-gray-200">
                                    <p className="text-xs text-gray-500 mb-1">If QR code doesn't scan, show this:</p>
                                    <p className="font-mono text-sm font-bold">{booking.bookingCode}</p>
                                </div>
                                
                                {/* Debug info - only visible in development */}
                                <div className="mt-3 text-xs text-gray-400 bg-gray-100 p-2 rounded max-w-[250px] overflow-hidden">
                                    <p className="truncate">{qrDebug}</p>
                                    <details className="mt-1">
                                        <summary className="cursor-pointer text-blue-500">View QR Details</summary>
                                        <div className="mt-1 p-1 border border-gray-200 rounded bg-white">
                                            <p className="text-xs mb-1 font-semibold">Raw data:</p>
                                            <p className="text-xs whitespace-pre-wrap">{rawData}</p>
                                        </div>
                                        <a 
                                            href={qrUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="mt-2 block text-blue-600 hover:underline text-[10px]"
                                        >
                                            Open QR in new tab
                                        </a>
                                    </details>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-4 border-2 border-dashed rounded-lg">
                                <p className="text-sm text-gray-500">
                                    QR code could not be generated.
                                </p>
                            </div>
                        )}
                    </div>
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
                </div>
            </div>
        </div>
    );
};

export default ModernBookingTicket;