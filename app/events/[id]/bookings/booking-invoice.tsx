import React, { useState, useEffect, useRef } from 'react';
import { FileText, Calendar, Clock, Users, MapPin, CreditCard, Download as DownloadIcon, QrCode, Share2, Star, Ticket, XCircle } from 'lucide-react';

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
    ticketIndex?: number;
    totalTickets?: number;
}

const ModernBookingTicket: React.FC<ModernBookingTicketProps> = ({ bookingId, ticketIndex = 1, totalTickets = 1 }) => {
    const [booking, setBooking] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [user, setUser] = useState<UserProfile | null>(null);
    const ticketRef = useRef<HTMLDivElement>(null);
    const [showVoucherPopup, setShowVoucherPopup] = useState(false);

    useEffect(() => {
        if (
            booking &&
            booking.event._id === "68c2c33eb6ef88c76f50ce7c" &&
            booking.total * booking.totalTickets >= 4000 &&
            booking?.ticketIndex == 1 &&
            new Date(booking.bookedAt) >= new Date("2025-10-15T07:02:08.225+00:00") // Note: 20:00 UTC+5:30 is 14:30 UTC
        ) {
            console.log('Booking Data:', booking);
            setShowVoucherPopup(true);
        }

    }, [booking]);

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
                console.log('Fetched Booking Data:', bookingData.data);
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

    const handleDownloadTicket = async () => {
        if (!ticketRef.current) return;

        try {
            // Dynamically import the required libraries
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            // Improved options for better capture
            const options = {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: true,
                backgroundColor: '#ffffff',
                allowTaint: true,
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight,
                // Ensure the full height is captured
                height: ticketRef.current.scrollHeight,
                width: ticketRef.current.scrollWidth,
            };

            // Display loading indicator
            alert("Generating PDF, please wait...");

            // @ts-ignore - html2canvas types might be outdated
            const canvas = await html2canvas(ticketRef.current, options);

            const imgData = canvas.toDataURL('image/png', 1.0);

            // Create PDF with appropriate dimensions
            // Use A4 for more space
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Calculate dimensions for the PDF
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Calculate the best fit while preserving aspect ratio
            const imgWidth = pageWidth - 20; // 10mm margins on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // If image height is too large for the page, scale it down
            const finalImgHeight = Math.min(imgHeight, pageHeight - 20);
            const finalImgWidth = finalImgHeight * (canvas.width / canvas.height);

            // Center the image on the page
            const xOffset = (pageWidth - finalImgWidth) / 2;

            // Add image to PDF with margins
            pdf.addImage({
                imageData: imgData,
                x: xOffset, // Centered horizontally
                y: 10, // Top margin
                width: finalImgWidth,
                height: finalImgHeight,
                compression: 'FAST'
            });

            // Add footer text
            const footerText = `Ticket ID: ${booking?._id || 'N/A'}_ticket_${booking?.ticketIndex || ticketIndex}`;
            const fontSize = 8;
            const textWidth = pdf.getStringUnitWidth(footerText) * fontSize / pdf.internal.scaleFactor;
            const textX = (pageWidth - textWidth) / 2;
            const textY = pageHeight - 10; // 10mm from bottom

            pdf.setFontSize(fontSize);
            pdf.text(footerText, textX, textY);

            // Generate a filename with event name and booking ID
            const eventName = booking?.event?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ticket';
            const fileName = `${eventName}_ticket_${booking?.ticketIndex || ticketIndex}_of_${booking?.totalTickets || totalTickets}_${booking?._id?.slice(-6) || Date.now()}.pdf`;

            // Save the PDF
            pdf.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to download ticket. Please try again.');
        }
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
    if (loading) return <div className="text-center py-8">Loading ticket details...</div>;
    if (error) return <div className="text-center text-red-500 py-8">{error}</div>;
    if (!booking) return <div className="text-center py-8">No booking details found.</div>;

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
                ticketIndex: booking.ticketIndex || ticketIndex,
                totalTickets: booking.totalTickets || totalTickets,
                pricePerTicket: formatCurrency(booking.price),
                total: formatCurrency(booking.total),
                // Add a unique identifier for each ticket
                ticketId: `${booking._id}_ticket_${booking.ticketIndex || ticketIndex}`
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
        <div className="max-w-md mx-auto my-10 p-4 font-sans">
            {showVoucherPopup && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fadeIn"
                    onClick={() => setShowVoucherPopup(false)} // clicking outside also closes
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-96 max-w-sm p-6 text-center relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()} // prevents overlay click from closing when clicking inside
                    >
                        {/* Decorative Top Circle */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-full opacity-30"></div>

                        {/* Decorative Bottom Circle */}
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-indigo-400 via-purple-500 to-pink-500 rounded-full opacity-30"></div>

                        {/* Header Icon */}
                        <div className="flex items-center justify-center mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-12 h-12 text-yellow-400 animate-bounce"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M11.48 3.499a.562.562 0 011.04 0l2.064 4.186a.563.563 0 00.424.308l4.62.672a.563.563 0 01.312.961l-3.343 3.26a.563.563 0 00-.162.498l.789 4.596a.563.563 0 01-.817.593l-4.125-2.17a.563.563 0 00-.524 0l-4.125 2.17a.563.563 0 01-.817-.593l.789-4.596a.563.563 0 00-.162-.498l-3.343-3.26a.563.563 0 01.312-.961l4.62-.672a.563.563 0 00.424-.308L11.48 3.5z"
                                />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Congratulations!</h2>

                        {/* Madame Logo */}
                        <img
                            src="/images/Madame_(clothing).svg.png"
                            alt="Madame Logo"
                            className="w-1/2 h-auto mx-auto mb-4"
                        />

                        {/* Main Voucher Text */}
                        <p className="text-gray-700 mb-4 text-sm">
                            <span className="font-semibold text-indigo-600">You have got</span>{" "}
                            <span className="font-bold text-green-600">₹2,000 Madame Shopping Vouchers</span>!<br />
                            Redeem your voucher at <span className="font-semibold text-pink-700">any Madame Store PAN India</span> within{" "}
                            <span className="font-semibold text-orange-600">6 months</span> of issue.
                        </p>

                        {/* Contact Info */}
                        <p className="text-gray-700 mb-4 text-sm">
                            Please contact <span className="font-semibold text-indigo-600">8730986585</span> to claim your voucher.
                        </p>

                        {/* Brand Info */}
                        <p className="text-gray-500 mb-6 text-xs leading-relaxed">
                            With over <span className="font-semibold text-gray-700">900+ retail touchpoints nationwide</span>, Madame is India’s leading women’s western-wear brand — creating looks for every season and styles for every reason.
                        </p>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowVoucherPopup(false)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}




            <div ref={ticketRef} id="booking-ticket" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-6 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            {/* You can replace this with your actual logo component or img tag */}
                            <div className="w-full h-6  rounded-lg flex items-center justify-center">
                                <img src="/images/Logo.png" className='w-1/2 h-auto' alt="Logo" />
                            </div>
                            {/* <div className="bg-white/20 px-3 py-1 rounded-full">
                                    <span className="text-white text-xs font-semibold tracking-wide">PAID</span>
                                </div> */}
                        </div>
                        <p className="text-white/90 text-sm font-medium">Booking Confirmed For</p>
                        <h1 className="text-white text-2xl font-bold tracking-tight mt-1">{booking.event?.title || "Event Title"}</h1>
                    </div>
                </div>

                {/* Ticket Body */}
                <div className="px-6 py-6">
                    {/* Ticket Type & Details Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                        {/* --- THIS IS THE NEW TICKET CATEGORY SECTION --- */}
                        <div className="text-center mb-4">
                            <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wider">Ticket Type</p>
                            <h2 className="text-3xl font-extrabold text-indigo-700 tracking-tight">
                                {booking.ticketType}
                            </h2>
                            <p className='text-sm text-[#00CED1] font-medium'>
                                {(() => {
                                    // Find the specific ticket type for this booking
                                    const ticketType = booking.event?.ticketTypes?.find((t: any) => t.name === booking.ticketType);
                                    if (ticketType?.benefits && ticketType.benefits.length > 0) {
                                        // Display maximum 2 benefits
                                        return ticketType.benefits.slice(0, 2).join(' || ');
                                    }
                                    return "";
                                })()}
                            </p>
                            {(booking.totalTickets || totalTickets) > 1 && (
                                <div className="mt-2">
                                    <p className="text-sm text-indigo-600 font-medium">
                                        Ticket {booking.ticketIndex || ticketIndex} of {booking.totalTickets || totalTickets}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-blue-200 pt-4">
                            <div className="text-center">
                                <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                                <p className="text-sm font-bold text-gray-900">{formatDate(booking.event?.startDate || booking.event?.startTime || booking.startTime)}</p>
                            </div>
                            <div className="text-center">
                                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {formatTime(booking.event?.startDate || booking.event?.startTime || booking.startTime)} -
                                    {formatTime(booking.event?.endDate || booking.event?.endTime || booking.endTime ||
                                        (() => {
                                            const start = new Date(booking.event?.startDate || booking.event?.startTime || booking.startTime);
                                            start.setHours(start.getHours() + 2); // Default to 2 hours after start
                                            return start;
                                        })()
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Dashed Separator */}
                    <div className="border-t-2 border-dashed border-gray-200 my-6 relative">
                        <div className="absolute left-0 top-0 w-6 h-6 bg-gray-50 rounded-full -ml-9 -mt-3"></div>
                        <div className="absolute right-0 top-0 w-6 h-6 bg-gray-50 rounded-full -mr-9 -mt-3"></div>
                    </div>

                    {/* Total Amount & Payment Details */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-lg font-bold text-gray-900">Ticket Price</span>
                            <span className="text-2xl font-bold text-green-600">{formatCurrency(booking.price)}</span>
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

                    {/* QR Code Section */}
                    <div className="text-center">
                        {qrUrl ? (
                            <div className="flex flex-col items-center">
                                <div className="border-4 border-blue-100 rounded-lg p-2 bg-white inline-block">
                                    <img
                                        src={qrUrl}
                                        alt="Booking QR Code"
                                        width={180}
                                        height={180}
                                        className="mx-auto"
                                    />
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-sm font-medium text-blue-700">Scan at {booking.event?.location?.address || "Event Location"} for Entry</p>
                                    {/* Improved Booking Code Display */}
                                    <div className="mt-3 bg-gray-100 px-3 py-1.5 rounded-md inline-block">
                                        <p className="text-xs text-gray-500">Ticket ID</p>
                                        <p className="font-mono text-sm font-bold text-gray-800 tracking-wider">
                                            {booking._id}_ticket_{booking.ticketIndex || ticketIndex}
                                        </p>
                                    </div>
                                    {(booking.totalTickets || totalTickets) > 1 && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            Ticket {booking.ticketIndex || ticketIndex} of {booking.totalTickets || totalTickets}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-4 border-2 border-dashed rounded-lg">
                                <p className="text-sm text-gray-500">
                                    QR code is being generated. Please wait...
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t mt-6">
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownloadTicket}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center disabled:bg-blue-300"
                        >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Download Ticket
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModernBookingTicket;