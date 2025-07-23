import React, { useState } from 'react';
import { FileText, Calendar, Clock, Users, MapPin, CreditCard, Download } from 'lucide-react';
interface UserProfile {
    name: string;
    email: string;
    phone: string;
    bio: string;
    interests: string[];
    [key: string]: any; // Allow other properties
}
const BookingInvoiceCard = () => {
    const [booking, setBooking] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);



    React.useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    setError(data.message || "Failed to fetch profile");
                } else {
                    setUser(data.data.user);
                }
            } catch (e) {
                setError("Network error. Please try again.");
            }
            setLoading(false);
        };

        const fetchBookings = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('You must be logged in to view your bookings.');
                    setLoading(false);
                    return;
                }
                const response = await fetch('/api/bookings/my-bookings', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },

                });
               // console.log(response)
                if (!response.ok) {
                    throw new Error('Failed to fetch bookings.');
                }
                const data = await response.json();
                const bookings=data.bookings;
                console.log(bookings)

                if (bookings && bookings.length > 0) {
                    // Sort bookings by createdAt descending, pick the most recent
                    const sorted = [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    console.log(sorted[0]);
                    setBooking(sorted[0]);
                    console.log("HELLO")
                } 
                else {
                    setError('No bookings found.');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load booking.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
        fetchBookings();
    }, []);



    const formatDate = (date: string | number | Date) => {
        return new Date(date).toLocaleDateString('en-US', {
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
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleDownload = () => {
        alert('Invoice download functionality would be implemented soon');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-10">
                <span className="text-gray-500">Loading invoice...</span>
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
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">

                        <div>
                            <h1 className="text-white text-lg font-semibold">Invoice</h1>
                            <p className="text-blue-100 text-sm">Booking ID: #{booking._id}</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor('confirmed')}`}>
                        {'confirmed'}
                    </span>
                </div>
            </div>

            {/* Customer & Booking Info */}
            <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div className='align-left'>
                        <p className="text-xs text-blue-700 mb-1 font-medium">{booking.user?.username || booking.user?.name || user?.name}</p>
                        <p className="text-xs text-blue-700 mb-1 font-medium">{booking.user?.email || user?.email}</p>
                        {booking.user?.phone && (
                            <p className="text-gray-500 text-xs">{booking.user.phone || user?.phone}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Court By: {booking.courtBy}</p>
                        <p className="text-xs text-gray-500">Booked on: {formatDate(booking.createdAt)} {formatTime(booking.createdAt)}</p>
                    </div>
                </div>

                {/* Booking Notes */}
                {booking.notes && (
                    <div className="mb-2">
                        <span className="inline-block bg-yellow-50 text-yellow-800 text-xs px-2 py-1 rounded">Note: {booking.notes}</span>
                    </div>
                )}

                {/* Court Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                        <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="font-medium text-gray-900">{booking.court?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{booking.court?.location}</span>
                        <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {booking.players} players
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(booking.startTime)}
                        </span>
                        <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </span>
                    </div>
                    {booking.court?.type && (
                        <div className="text-xs text-gray-500 mt-1">Court Type: {booking.court.type}</div>
                    )}
                </div>

                {/* Time Slots */}
                <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Time Slots</h3>
                    <div className="space-y-1">
                        {booking.timeSlots?.map((slot: any, index: number) => (
                            <div key={index} className="flex justify-between items-center py-1 text-sm">
                                <span className="text-gray-600">{slot.startTime} - {slot.endTime}</span>
                                <span className="text-gray-900 font-medium">{formatCurrency(slot.price)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(booking.totalAmount)}</span>
                    </div>

                    {booking.payment && (
                        <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center mb-2">
                                <CreditCard className="w-4 h-4 text-green-600 mr-2" />
                                <span className="text-sm font-medium text-green-800">Payment Confirmed</span>
                            </div>
                            <div className="text-xs text-green-700">
                                <p>{booking.payment.method} • {booking.payment.transactionId}</p>
                                <p>Paid on {formatDate(booking.payment.paidAt)} {formatTime(booking.payment.paidAt)}</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:items-center">
                    <div>
                        <p className="text-xs text-gray-500">Thanks for booking with us!</p>
                        <p className="text-xs text-gray-400">Generated on {formatDate(new Date())} {formatTime(new Date())}</p>
                    </div>
                    {/* <button
                        onClick={handleDownload}
                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                    </button> */}
                </div>
            </div>
        </div>
    );
};

export default BookingInvoiceCard; 