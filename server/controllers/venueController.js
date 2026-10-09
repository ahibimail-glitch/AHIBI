const Venue = require('../models/Venue');

// Get all approved venues for public display
const getPublicVenues = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, city, state } = req.query;
    
    // Build query for approved venues only
    const query = { status: 'approved' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }
    
    if (state) {
      query['address.state'] = { $regex: state, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    
    const venues = await Venue.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -__v');

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
    console.error('Get public venues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues'
    });
  }
};

// Get venue details by ID (public view)
const getPublicVenueById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const venue = await Venue.findOne({ 
      _id: id, 
      status: 'approved' 
    }).select('-password -__v');
    
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
    console.error('Get public venue by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue'
    });
  }
};

module.exports = {
  getPublicVenues,
  getPublicVenueById
};
