"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  DollarSign, 
  Eye, 
  Check, 
  X, 
  Search,
  Filter,
  Download,
  Phone,
  Mail,
  Star
} from 'lucide-react';

interface Booking {
  _id: string;
  artist: {
    _id: string;
    name: string;
    profilePic?: string;
    rating: { average: number; count: number };
  };
  organizer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    companyName?: string;
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
    eventType: string;
  };
  booking: {
    status: 'pending' | 'accepted' | 'declined' | 'confirmed' | 'completed' | 'cancelled';
    requestedAmount: number;
    finalAmount?: number;
    paymentStatus: 'pending' | 'advance_paid' | 'fully_paid';
  };
  createdAt: string;
}

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Mock data
  useEffect(() => {
    const mockBookings: Booking[] = [
      {
        _id: '1',
        artist: {
          _id: 'a1',
          name: 'Rahul Sharma',
          profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          rating: { average: 4.8, count: 156 }
        },
        organizer: {
          _id: 'o1',
          name: 'Priya Events',
          email: 'priya@events.com',
          phone: '+91 9876543210',
          companyName: 'Priya Event Management'
        },
        event: {
          name: 'Corporate Annual Day',
          date: '2024-12-15',
          startTime: '18:00',
          endTime: '21:00',
          venue: {
            name: 'Grand Ballroom',
            address: 'Hotel Taj, Mumbai'
          },
          eventType: 'Corporate'
        },
        booking: {
          status: 'pending',
          requestedAmount: 75000,
          paymentStatus: 'pending'
        },
        createdAt: '2024-11-01T10:30:00Z'
      },
      {
        _id: '2',
        artist: {
          _id: 'a2',
          name: 'Priya Patel',
          profilePic: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          rating: { average: 4.6, count: 78 }
        },
        organizer: {
          _id: 'o2',
          name: 'Wedding Bells',
          email: 'contact@weddingbells.com',
          phone: '+91 9876543211',
          companyName: 'Wedding Bells Pvt Ltd'
        },
        event: {
          name: 'Sangam & Riya Wedding',
          date: '2024-12-20',
          startTime: '19:00',
          endTime: '23:00',
          venue: {
            name: 'Palace Gardens',
            address: 'Udaipur, Rajasthan'
          },
          eventType: 'Wedding'
        },
        booking: {
          status: 'confirmed',
          requestedAmount: 50000,
          finalAmount: 45000,
          paymentStatus: 'advance_paid'
        },
        createdAt: '2024-10-28T14:15:00Z'
      }
    ];

    setTimeout(() => {
      setBookings(mockBookings);
      setFilteredBookings(mockBookings);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter bookings
  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.organizer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.event.eventType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      accepted: { color: 'bg-blue-100 text-blue-800', label: 'Accepted' },
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      completed: { color: 'bg-purple-100 text-purple-800', label: 'Completed' },
      declined: { color: 'bg-red-100 text-red-800', label: 'Declined' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-red-100 text-red-800', label: 'Pending' },
      advance_paid: { color: 'bg-yellow-100 text-yellow-800', label: 'Advance Paid' },
      fully_paid: { color: 'bg-green-100 text-green-800', label: 'Fully Paid' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter(b => b.booking.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter(b => b.booking.status === 'confirmed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{bookings.reduce((sum, b) => sum + (b.booking.finalAmount || b.booking.requestedAmount), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button className="flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Artist
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organizer
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.event.name}</div>
                      <div className="text-sm text-gray-500">{booking.event.eventType}</div>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(booking.event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {booking.event.startTime} - {booking.event.endTime}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {booking.event.venue.name}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={booking.artist.profilePic || '/default-avatar.png'}
                        alt={booking.artist.name}
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{booking.artist.name}</div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">
                            {booking.artist.rating.average} ({booking.artist.rating.count})
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.organizer.name}</div>
                      {booking.organizer.companyName && (
                        <div className="text-sm text-gray-500">{booking.organizer.companyName}</div>
                      )}
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Mail className="w-4 h-4 mr-1" />
                        {booking.organizer.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="w-4 h-4 mr-1" />
                        {booking.organizer.phone}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        ₹{(booking.booking.finalAmount || booking.booking.requestedAmount).toLocaleString()}
                      </div>
                      {booking.booking.finalAmount && booking.booking.finalAmount !== booking.booking.requestedAmount && (
                        <div className="text-sm text-gray-500">
                          Original: ₹{booking.booking.requestedAmount.toLocaleString()}
                        </div>
                      )}
                      <div className="mt-1">
                        {getPaymentBadge(booking.booking.paymentStatus)}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {getStatusBadge(booking.booking.status)}
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Event Information</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Event:</span> {selectedBooking.event.name}</p>
                    <p><span className="font-medium">Type:</span> {selectedBooking.event.eventType}</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedBooking.event.date).toLocaleDateString()}</p>
                    <p><span className="font-medium">Time:</span> {selectedBooking.event.startTime} - {selectedBooking.event.endTime}</p>
                    <p><span className="font-medium">Venue:</span> {selectedBooking.event.venue.name}</p>
                    <p><span className="font-medium">Address:</span> {selectedBooking.event.venue.address}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Booking Information</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Status:</span> {getStatusBadge(selectedBooking.booking.status)}</p>
                    <p><span className="font-medium">Payment:</span> {getPaymentBadge(selectedBooking.booking.paymentStatus)}</p>
                    <p><span className="font-medium">Requested Amount:</span> ₹{selectedBooking.booking.requestedAmount.toLocaleString()}</p>
                    {selectedBooking.booking.finalAmount && (
                      <p><span className="font-medium">Final Amount:</span> ₹{selectedBooking.booking.finalAmount.toLocaleString()}</p>
                    )}
                    <p><span className="font-medium">Created:</span> {new Date(selectedBooking.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Artist Details</h4>
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedBooking.artist.profilePic || '/default-avatar.png'}
                      alt={selectedBooking.artist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium">{selectedBooking.artist.name}</p>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {selectedBooking.artist.rating.average} ({selectedBooking.artist.rating.count} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Organizer Details</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedBooking.organizer.name}</p>
                    {selectedBooking.organizer.companyName && (
                      <p><span className="font-medium">Company:</span> {selectedBooking.organizer.companyName}</p>
                    )}
                    <p><span className="font-medium">Email:</span> {selectedBooking.organizer.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedBooking.organizer.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
