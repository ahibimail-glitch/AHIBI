'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';

interface MelitaBooking {
    _id: string;
    user: {
        name: string;
        email: string;
    };
    product: {
        name: string;
    };
    deliveryAddress: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
    };
    amount: number;
    status: string;
    razorpay_order_id: string;
    createdAt: string;
    coupon?: {
        code: string;
        discountPercentage: number;
        discountAmount: number;
    };
}

const MelitaBookings = () => {
    const [bookings, setBookings] = useState<MelitaBooking[]>([]);
        const [loading, setLoading] = useState(true);

    const handleExport = () => {
        const worksheet = XLSX.utils.json_to_sheet(bookings.map(b => ({
            'Order ID': b.razorpay_order_id,
            'Customer Name': b.deliveryAddress.name,
            'Customer Email': b.user.email,
            'Phone': b.deliveryAddress.phone,
            'Address': b.deliveryAddress.address,
            'City': b.deliveryAddress.city,
            'State': b.deliveryAddress.state,
            'ZIP': b.deliveryAddress.zip,
            'Product': b.product.name,
            'Coupon Used': b.coupon?.code || 'None',
            'Discount': b.coupon?.discountAmount ? `₹${b.coupon.discountAmount}` : 'N/A',
            'Date': new Date(b.createdAt).toLocaleDateString(),
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Melita Bookings');
        XLSX.writeFile(workbook, 'melita_bookings.xlsx');
    };
    
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const localToken = localStorage.getItem('admin_token');
                if (!localToken) {
                    console.error('No token found');
                    setLoading(false);
                    return;
                }

                const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/melita/admin/bookings`, {
                    headers: {
                        Authorization: `Bearer ${localToken}`,
                    },
                });
                setBookings(data);
            } catch (error) {
                console.error('Failed to fetch Melita bookings', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
    <h1 className="text-2xl font-semibold">Melita Bookings</h1>
    <button
        onClick={handleExport}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
    >
        Export to Excel
    </button>
</div>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coupon Used</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.map((booking) => (
                            <tr key={booking._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.razorpay_order_id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.deliveryAddress.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.deliveryAddress.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${booking.deliveryAddress.address}, ${booking.deliveryAddress.city}, ${booking.deliveryAddress.state} - ${booking.deliveryAddress.zip}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.product.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {booking.coupon ? (
                                        <div>
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {booking.coupon.code}
                                            </span>
                                            {/* <p className="text-xs text-gray-500 mt-1">-₹{booking.coupon.discountAmount.toFixed(2)} ({booking.coupon.discountPercentage}% off)</p> */}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs">No coupon</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(booking.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MelitaBookings;
