'use client';

import { useEffect, useState, Suspense } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle, Download, Loader, Gift, Copy, Check } from 'lucide-react';
import Navbar from '@/app/Navbar';
import Footer from '@/app/Footer';

interface Booking {
    _id: string;
    product: { name: string; image: string };
    amount: number;
    razorpay_order_id: string;
    createdAt: string;
    user: { name: string; email: string };
    deliveryAddress: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
    };
    coupon?: {
        code: string;
        discountPercentage: number;
        discountAmount: number;
    };
}

const PaymentSuccessContent = () => {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('booking_id');

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [rewardCoupon, setRewardCoupon] = useState<any | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!bookingId) {
            setError('Booking ID not found.');
            setLoading(false);
            return;
        }

        const fetchBooking = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('You must be logged in to view this page.');
                    setLoading(false);
                    return;
                }

                const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/melita/bookings/${bookingId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setBooking(data);
                // If a coupon was used, fetch the generated reward coupon (idempotent by bookingId)
                if (data.coupon?.code || true) {
                    setCouponLoading(true);
                    try {
                        const { data: couponData } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/melita/rewards/generate`, {
                            bookingId,
                        }, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        setRewardCoupon(couponData.coupon);
                    } catch (err) {
                        console.error('Failed to fetch reward coupon:', err);
                    } finally {
                        setCouponLoading(false);
                    }
                }
            } catch (err) {
                console.error(err);
                setError('Failed to fetch booking details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId]);

    const handleDownloadInvoice = async () => {
        if (!booking) return;
        setDownloading(true);

        const doc = new jsPDF();

        // HEADER
        doc.setFontSize(20);
        const pageWidth = doc.internal.pageSize.getWidth(); // Get page width
        const title = 'Invoice';
        const textWidth = doc.getTextWidth(title);          // Get width of text
        doc.text(title, (pageWidth - textWidth) / 2, 22);  // Centered

        doc.setFontSize(12);
        doc.text('Melita', 14, 30);
        doc.text('123 Beauty Lane, Glam City, 110011', 14, 36);
        doc.text(`Phone: +91 9876543210`, 14, 42);

        // BILL TO
        doc.setFontSize(12);
        doc.text('Bill To:', 14, 55);
        doc.text(`${booking.deliveryAddress.name}`, 14, 61);
        doc.text(`${booking.deliveryAddress.address}, ${booking.deliveryAddress.city}, ${booking.deliveryAddress.state} - ${booking.deliveryAddress.zip}`, 14, 67);
        doc.text(`Phone: ${booking.deliveryAddress.phone}`, 14, 73);
        doc.text(`Email: ${booking.user.email}`, 14, 79);


        // ORDER DETAILS
        doc.text(`Order ID: ${booking.razorpay_order_id}`, 14, 85);
        doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString()}`, 14, 91);



        // TABLE WITH IMAGE
        (doc as any).autoTable({
            startY: 105,
            head: [['Product', 'Quantity', 'Price', 'Total']],
            body: [
                [
                    booking.product.name,
                    '1',
                    `₹${booking.amount.toFixed(2)}`,
                    `₹${booking.amount.toFixed(2)}`,
                ],
            ],
            theme: 'striped',
            headStyles: { fillColor: [131, 83, 57] },
        });

        // FOOTER
        const finalY = (doc as any).lastAutoTable.finalY || 140;
        doc.setFontSize(10);
        doc.text('Thank you for your purchase!', 14, finalY + 10);
        doc.text('For support, contact support@ahibi.com', 14, finalY + 16);

        doc.save(`invoice-${booking.razorpay_order_id}.pdf`);
        setDownloading(false);
    };

    const handleDownloadCoupon = () => {
        if (!rewardCoupon) return;
        const doc = new jsPDF();

        // HEADER
        doc.setFontSize(20);
        const pageWidth = doc.internal.pageSize.getWidth();
        const title = 'AHIBI FEST COUPON';
        const textWidth = doc.getTextWidth(title);
        doc.text(title, (pageWidth - textWidth) / 2, 22);

        // COUPON DETAILS
        doc.setFontSize(16);
        doc.text(`Code: ${rewardCoupon.code}`, 14, 40);
        doc.text(`Discount: ${rewardCoupon.discountPercentage}% OFF`, 14, 50);
        doc.text(`Event: Ahibi Fest`, 14, 60);
        doc.text(`Ticket Type: General Admission`, 14, 70);
        // doc.text(`Generated by: Melita`, 14, 80);

        // TERMS
        doc.setFontSize(10);
        doc.text('Terms & Conditions:', 14, 100);
        doc.text('• Valid for Ahibi Fest General Admission tickets only', 14, 110);
        doc.text('• Cannot be combined with other offers', 14, 120);
        doc.text('• Subject to availability', 14, 130);

        doc.save(`ahibi-fest-coupon-${rewardCoupon.code}.pdf`);
    };

    const handleCopyCode = () => {
        if (!rewardCoupon) return;
        navigator.clipboard.writeText(rewardCoupon.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader className="w-12 h-12 animate-spin text-[#835339] mb-4" />
                <p className="text-lg text-gray-600">Loading your order details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <a href="/" className="text-blue-600 underline">
                    Go back to homepage
                </a>
            </div>
        );
    }

    if (!booking) {
        return <p className="text-center py-12">No booking details found.</p>;
    }

    return (
        <section className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 sm:p-12 max-w-4xl mx-auto">
            <header className="text-center mb-8">
                <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl sm:text-4xl font-light text-gray-900">Payment Successful!</h1>
                <p className="text-gray-600 mt-2">Thank you for your purchase. Your order has been confirmed.</p>
            </header>

            <div className="bg-gradient-to-br from-amber-50/50 to-stone-50/50 rounded-2xl p-6 sm:p-8 mb-8">
                <h2 className="text-2xl font-light text-gray-800 mb-6 border-b pb-4">Order Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                        <img src={booking.product.image} alt={booking.product.name} className="w-24 h-24 rounded-lg object-cover" />
                        <div>
                            <p className="font-semibold text-lg text-gray-800">{booking.product.name}</p>
                            <p className="text-gray-600 text-sm">Order ID: {booking.razorpay_order_id}</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                        <p className="text-3xl font-light text-[#835339]">₹{booking.amount.toFixed(2)}</p>
                        <p className="text-gray-500 text-sm">Paid on {new Date(booking.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Reward Coupon Section */}
            {couponLoading && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 sm:p-8 mb-8">
                    <div className="flex items-center justify-center">
                        <Loader className="w-6 h-6 animate-spin text-green-600 mr-2" />
                        <p className="text-green-700">Generating your reward coupon...</p>
                    </div>
                </div>
            )}

            {rewardCoupon && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 sm:p-8 mb-8 border-2 border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                        <Gift className="w-8 h-8 text-green-600" />
                        <h2 className="text-2xl font-light text-green-800">🎉 Your Reward Coupon!</h2>
                    </div>
                    <p className="text-green-700 mb-6">Thank you for using a Melita coupon! Here's your exclusive Ahibi Fest discount:</p>
                    
                    <div className="bg-white rounded-xl p-6 border-2 border-dashed border-green-300">
                        <div className="text-center mb-4">
                            <h3 className="text-3xl font-bold text-green-800 mb-2">AHIBI FEST</h3>
                            <p className="text-gray-600">General Admission</p>
                        </div>
                        
                        <div className="text-center mb-6">
                            <div className="inline-block bg-green-100 rounded-lg px-4 py-2 mb-2">
                                <span className="text-2xl font-mono font-bold text-green-800">{rewardCoupon.code}</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">{rewardCoupon.discountPercentage}% OFF</p>
                        </div>

                        <div className="flex gap-4 text-sm text-gray-600 mb-6">
                            <div>
                                <span className="font-semibold">Event:</span> Ahibi Fest
                            </div>
                            <div>
                                <span className="font-semibold">Ticket Type:</span> General Admission
                            </div>
                            {/* <div>
                                <span className="font-semibold">Generated by:</span> Melita
                            </div> */}
                            <div>
                                <span className="font-semibold">Valid for:</span> Ahibi Fest tickets only
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleCopyCode}
                                className="flex-1 bg-green-600 text-white font-semibold rounded-lg py-3 px-4 transition-all hover:bg-green-700 flex items-center justify-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy Code'}
                            </button>
                            <button
                                onClick={handleDownloadCoupon}
                                className="flex-1 bg-green-700 text-white font-semibold rounded-lg py-3 px-4 transition-all hover:bg-green-800 flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Coupon
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center">
                <button
                    onClick={handleDownloadInvoice}
                    disabled={downloading}
                    className={`bg-gradient-to-r from-[#835339] to-amber-700 text-white font-semibold rounded-xl py-3 px-8 transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-300 inline-flex items-center gap-2 ${downloading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {downloading ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    {downloading ? 'Generating...' : 'Download Invoice'}
                </button>
            </div>
        </section>
    );
};

const PaymentSuccessPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-12">
                <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh] text-center"><Loader className="w-12 h-12 animate-spin text-[#835339] mb-4" /><p className="text-lg text-gray-600">Loading...</p></div>}>
                    <PaymentSuccessContent />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
};

export default PaymentSuccessPage;
