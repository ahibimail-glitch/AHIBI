const Venue = require('../models/Venue');
const AdminNotification = require('../models/AdminNotification');
const emailService = require('../services/emailService');

// Get all venues for admin
const getAllVenues = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const venues = await Venue.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');

    const total = await Venue.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        venues,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all venues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues'
    });
  }
};

// Get venue details
const getVenueById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const venue = await Venue.findById(id).select('-password');
    
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { venue }
    });

  } catch (error) {
    console.error('Get venue by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue'
    });
  }
};

// Approve venue
const approveVenue = async (req, res) => {
  console.log("🔥 APPROVE VENUE FUNCTION CALLED! 🔥");
  console.log("pabitraaa");
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    console.log('=== APPROVE VENUE DEBUG ===');
    console.log('Venue ID:', id);
    console.log('Request body:', req.body);
    console.log('Admin user:', req.admin?.id);
    
    const venue = await Venue.findById(id);
    console.log('Found venue:', venue ? 'YES' : 'NO');
    if (venue) {
      console.log('Venue current status:', venue.status);
      console.log('Venue _id:', venue._id);
    }

    if (!venue) {
      console.log('ERROR: Venue not found');
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    if (venue.status !== 'pending') {
      console.log('ERROR: Venue not pending. Current status:', venue.status);
      return res.status(400).json({
        success: false,
        message: 'Venue is not pending approval'
      });
    }

    console.log('Proceeding with approval update...');
    // Update venue status atomically and get the updated document back
    const updatedVenue = await Venue.findByIdAndUpdate(
      id,
      {
        status: 'approved'
      },
      { new: true }
    );
    
    console.log('Update result:', updatedVenue ? 'SUCCESS' : 'FAILED');
    if (updatedVenue) {
      console.log('New status:', updatedVenue.status);
    }

    // Create admin notification
    await AdminNotification.create({
      type: 'venue_approved',
      title: 'Venue Approved',
      message: `Venue "${(updatedVenue && (updatedVenue.businessName || updatedVenue.name)) || venue.name}" has been approved and is now active.`,
      priority: 'medium',
      metadata: {
        venueId: id,
        venueName: updatedVenue?.name || venue.name,
        businessName: updatedVenue?.businessName || venue.businessName,
        email: updatedVenue?.email || venue.email,
        phone: updatedVenue?.phone || venue.phone,
        status: updatedVenue?.status || 'approved',
        approvedBy: req.admin?.id || 'system',
        notes
      },
      actionUrl: `/admin/venues/${id}`
    });

    // Send approval email to venue
    try {
      await emailService.sendVenueApprovalNotification(updatedVenue || venue, notes);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the approval if email fails
    }

    console.log('=== APPROVAL SUCCESSFUL ===');
    res.status(200).json({
      success: true,
      message: 'Venue approved successfully',
      data: { venue: updatedVenue }
    });

  } catch (error) {
    console.error('=== APPROVAL ERROR ===');
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve venue'
    });
  }
};

// Reject venue
const rejectVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const venue = await Venue.findById(id);
    
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    if (venue.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Venue is not pending approval'
      });
    }

    const updatedVenue = await Venue.findByIdAndUpdate(
      id,
      {
        status: 'rejected'
      },
      { new: true }
    );

    // Create admin notification
    await AdminNotification.create({
      type: 'venue_rejected',
      title: 'Venue Rejected',
      message: `Venue "${(updatedVenue && (updatedVenue.businessName || updatedVenue.name)) || venue.name}" has been rejected.`,
      priority: 'medium',
      metadata: {
        venueId: id,
        venueName: updatedVenue?.name || venue.name,
        businessName: updatedVenue?.businessName || venue.businessName,
        email: updatedVenue?.email || venue.email,
        phone: updatedVenue?.phone || venue.phone,
        status: updatedVenue?.status || 'rejected',
        rejectedBy: req.admin?.id || 'system',
        reason,
        notes
      },
      actionUrl: `/admin/venues/${id}`
    });

    // Send rejection email to venue
    try {
      await emailService.sendVenueRejectionNotification(updatedVenue || venue, reason, notes);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Venue rejected successfully',
      data: { venue: updatedVenue }
    });

  } catch (error) {
    console.error('Reject venue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject venue'
    });
  }
};

module.exports = {
  getAllVenues,
  getVenueById,
  approveVenue,
  rejectVenue
};
