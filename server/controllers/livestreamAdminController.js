/**
 * Admin Livestream Management Controller
 * Handles admin operations for livestream user management
 */

const asyncHandler = require('express-async-handler');
const LivestreamPurchase = require('../models/LivestreamPurchase');
const LiveStream = require('../models/LiveStream');
const User = require('../models/User');

/**
 * @desc    Public test endpoint without authentication
 * @route   GET /api/livestream/public-test
 * @access  Public
 */
const publicTestEndpoint = asyncHandler(async (req, res) => {
  try {
    console.log('Public test endpoint called');
    res.json({
      success: true,
      message: 'Public test endpoint is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Public test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Public test endpoint failed',
      error: error.message
    });
  }
});

/**
 * @desc    Test endpoint for admin controller
 * @route   GET /api/livestream/admin/test
 * @access  Private/Admin
 */
const testEndpoint = asyncHandler(async (req, res) => {
  try {
    console.log('Admin test endpoint called by user:', req.user._id);
    res.json({
      success: true,
      message: 'Admin controller is working',
      user: req.user._id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
});

/**
 * @desc    Search users by name, email, or phone
 * @route   GET /api/livestream/admin/users/search
 * @access  Private/Admin
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  try {
    console.log('Searching users with query:', query);
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name email phone profilePic createdAt')
    .sort({ createdAt: -1 })
    .limit(20);

    console.log('Found users:', users.length);
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @desc    Get all livestreams for admin selection
 * @route   GET /api/livestream/admin/streams/list
 * @access  Private/Admin
 */
const getLivestreamsList = asyncHandler(async (req, res) => {
  try {
    console.log('Fetching livestreams list...');
    
    // First try to get actual data
    let streams;
    try {
      streams = await LiveStream.find({ 
        isDeleted: false,
        accessType: 'paid' // Only show paid streams for manual purchase
      })
      .select('title price status scheduledStartTime thumbnailUrl')
      .sort({ createdAt: -1 });
      console.log('Found streams:', streams.length);
    } catch (dbError) {
      console.error('Database query failed, returning mock data:', dbError);
      // Return mock data if database fails
      streams = [
        {
          _id: 'mock1',
          title: 'Test Livestream 1',
          price: 299,
          status: 'idle',
          scheduledStartTime: new Date(),
          thumbnailUrl: ''
        },
        {
          _id: 'mock2', 
          title: 'Test Livestream 2',
          price: 499,
          status: 'active',
          scheduledStartTime: new Date(),
          thumbnailUrl: ''
        }
      ];
    }

    res.json({
      success: true,
      data: streams,
      note: streams.length > 0 && streams[0]._id === 'mock1' ? 'Using mock data due to database error' : 'Using real data'
    });
  } catch (error) {
    console.error('Get livestreams list error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch livestreams',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @desc    Create manual livestream purchase for user (admin only)
 * @route   POST /api/livestream/admin/manual-purchase
 * @access  Private/Admin
 */
const createManualPurchase = asyncHandler(async (req, res) => {
  const { userId, livestreamId, notes } = req.body;

  if (!userId || !livestreamId) {
    return res.status(400).json({
      success: false,
      message: 'User ID and livestream ID are required'
    });
  }

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if livestream exists and is paid
    const livestream = await LiveStream.findById(livestreamId);
    if (!livestream) {
      return res.status(404).json({
        success: false,
        message: 'Livestream not found'
      });
    }

    if (livestream.accessType !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This livestream does not require payment'
      });
    }

    // Check if user already has valid access
    const existingPurchase = await LivestreamPurchase.findUserValidAccess(userId, livestreamId);
    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'User already has access to this livestream'
      });
    }

    // Create manual purchase record
    const purchase = await LivestreamPurchase.create({
      user: userId,
      livestream: livestreamId,
      amount: 0, // Free for manual admin purchase
      currency: 'INR',
      razorpayOrderId: `manual_admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      accessGranted: true,
      paymentDate: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      // Add admin metadata
      adminPurchase: true,
      adminId: req.user._id,
      notes: notes || 'Manual purchase by admin'
    });

    // Populate response data
    const populatedPurchase = await LivestreamPurchase.findById(purchase._id)
      .populate('user', 'name email phone')
      .populate('livestream', 'title description price thumbnailUrl');

    res.json({
      success: true,
      message: 'Manual livestream purchase created successfully',
      data: populatedPurchase
    });
  } catch (error) {
    console.error('Create manual purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create manual purchase'
    });
  }
});

/**
 * @desc    Get all livestream purchases for admin with user management
 * @route   GET /api/livestream/admin/purchases
 * @access  Private/Admin
 */
const getAllPurchases = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, userId, livestreamId } = req.query;

  try {
    const query = { status: 'completed' }; // Only show completed purchases
    
    if (status) query.status = status;
    if (userId) query.user = userId;
    if (livestreamId) query.livestream = livestreamId;

    const purchases = await LivestreamPurchase.find(query)
      .populate('user', 'name email phone profilePic')
      .populate('livestream', 'title price status thumbnailUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LivestreamPurchase.countDocuments(query);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchases'
    });
  }
});

/**
 * @desc    Delete a livestream purchase (admin only)
 * @route   DELETE /api/livestream/admin/purchases/:purchaseId
 * @access  Private/Admin
 */
const deletePurchase = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;

  try {
    const purchase = await LivestreamPurchase.findById(purchaseId)
      .populate('user', 'name email')
      .populate('livestream', 'title');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Store info for response before deletion
    const purchaseInfo = {
      user: purchase.user,
      livestream: purchase.livestream,
      amount: purchase.amount,
      purchaseDate: purchase.createdAt
    };

    // Delete the purchase
    await LivestreamPurchase.findByIdAndDelete(purchaseId);

    res.json({
      success: true,
      message: 'Livestream purchase deleted successfully',
      data: purchaseInfo
    });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase'
    });
  }
});

/**
 * @desc    Get user's livestream purchase history
 * @route   GET /api/livestream/admin/users/:userId/purchases
 * @access  Private/Admin
 */
const getUserPurchaseHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const purchases = await LivestreamPurchase.find({ 
      user: userId, 
      status: 'completed' // Only show completed purchases
    })
      .populate('livestream', 'title price status thumbnailUrl scheduledStartTime')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LivestreamPurchase.countDocuments({ 
      user: userId, 
      status: 'completed' 
    });

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profilePic: user.profilePic
        },
        purchases,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user purchase history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user purchase history'
    });
  }
});

module.exports = {
  publicTestEndpoint,
  testEndpoint,
  searchUsers,
  getLivestreamsList,
  createManualPurchase,
  getAllPurchases,
  deletePurchase,
  getUserPurchaseHistory
};
