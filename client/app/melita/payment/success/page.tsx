'use client';

import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle, Download, Loader } from 'lucide-react';
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
}

const PaymentSuccessContent = () => {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('booking_id');

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

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
                <PaymentSuccessContent />
            </main>
            <Footer />
        </div>
    );
};

export default PaymentSuccessPage;
