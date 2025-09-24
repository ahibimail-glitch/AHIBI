const BikerBash = require('../models/BikerBash');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// Get all BikerBash registrations with pagination
const getAllBikerBashRegistrations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const totalCount = await BikerBash.countDocuments();
    
    // Get registrations with populated data
    const registrations = await BikerBash.find()
      .populate('bookingId', 'status paymentStatus createdAt')
      .populate('eventId', 'title startDate endDate location')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    return ApiResponse.success(res, 'BikerBash registrations retrieved successfully', {
      registrations,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching BikerBash registrations:', error);
    return ApiResponse.serverError(res, 'Failed to fetch BikerBash registrations', error);
  }
};

// Get BikerBash registration by ID
const getBikerBashRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await BikerBash.findById(id)
      .populate('bookingId', 'status paymentStatus createdAt')
      .populate('eventId', 'title startDate endDate location')
      .populate('userId', 'name email phone');

    if (!registration) {
      return ApiResponse.notFound(res, 'BikerBash registration not found');
    }

    return ApiResponse.success(res, 'BikerBash registration retrieved successfully', registration);
  } catch (error) {
    console.error('Error fetching BikerBash registration:', error);
    return ApiResponse.serverError(res, 'Failed to fetch BikerBash registration', error);
  }
};

// Get BikerBash registrations by event ID
const getBikerBashRegistrationsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for this event
    const totalCount = await BikerBash.countDocuments({ eventId });
    
    // Get registrations for this event
    const registrations = await BikerBash.find({ eventId })
      .populate('bookingId', 'status paymentStatus createdAt')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    return ApiResponse.success(res, 'BikerBash registrations for event retrieved successfully', {
      registrations,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching BikerBash registrations by event:', error);
    return ApiResponse.serverError(res, 'Failed to fetch BikerBash registrations for event', error);
  }
};

// Update BikerBash registration status
const updateBikerBashStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return ApiResponse.badRequest(res, 'Invalid status. Must be pending, confirmed, or cancelled');
    }

    const registration = await BikerBash.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('bookingId', 'status paymentStatus')
     .populate('eventId', 'title')
     .populate('userId', 'name email');

    if (!registration) {
      return ApiResponse.notFound(res, 'BikerBash registration not found');
    }

    return ApiResponse.success(res, 'BikerBash registration status updated successfully', registration);
  } catch (error) {
    console.error('Error updating BikerBash registration status:', error);
    return ApiResponse.serverError(res, 'Failed to update BikerBash registration status', error);
  }
};

// Get BikerBash statistics
const getBikerBashStatistics = async (req, res) => {
  try {
    const totalRegistrations = await BikerBash.countDocuments();
    const confirmedRegistrations = await BikerBash.countDocuments({ status: 'confirmed' });
    const pendingRegistrations = await BikerBash.countDocuments({ status: 'pending' });
    const cancelledRegistrations = await BikerBash.countDocuments({ status: 'cancelled' });

    // Get registrations by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await BikerBash.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    return ApiResponse.success(res, 'BikerBash statistics retrieved successfully', {
      totalRegistrations,
      confirmedRegistrations,
      pendingRegistrations,
      cancelledRegistrations,
      monthlyStats
    });
  } catch (error) {
    console.error('Error fetching BikerBash statistics:', error);
    return ApiResponse.serverError(res, 'Failed to fetch BikerBash statistics', error);
  }
};

// Export BikerBash registrations to CSV
const exportBikerBashRegistrations = async (req, res) => {
  try {
    const registrations = await BikerBash.find()
      .populate('bookingId', 'status paymentStatus createdAt')
      .populate('eventId', 'title startDate endDate')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const csvHeaders = [
      'Registration ID',
      'Booking ID',
      'Event Title',
      'Event Date',
      'User Name',
      'User Email',
      'User Phone',
      'Contact Name',
      'Contact Phone',
      'Contact Email',
      'Ticket Type',
      'Ticket Price',
      'Status',
      'Registration Date'
    ];

    const csvRows = registrations.map(reg => [
      reg._id,
      reg.bookingId?._id || '',
      reg.eventId?.title || '',
      reg.eventId?.startDate ? new Date(reg.eventId.startDate).toLocaleDateString() : '',
      reg.userId?.name || '',
      reg.userId?.email || '',
      reg.userId?.phone || '',
      reg.contactInfo.name,
      reg.contactInfo.phone,
      reg.contactInfo.email,
      reg.ticketInfo.ticketType,
      reg.ticketInfo.price,
      reg.status,
      new Date(reg.createdAt).toLocaleDateString()
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bikerbash-registrations-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting BikerBash registrations:', error);
    return ApiResponse.serverError(res, 'Failed to export BikerBash registrations', error);
  }
};

module.exports = {
  getAllBikerBashRegistrations,
  getBikerBashRegistrationById,
  getBikerBashRegistrationsByEvent,
  updateBikerBashStatus,
  getBikerBashStatistics,
  exportBikerBashRegistrations
};
