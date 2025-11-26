const HeliTaxiiLead = require('../models/HeliTaxiiLead');
const ApiResponse = require('../utils/apiResponse');

// @desc    Create a Helitaxii lead when user clicks Book Now
// @route   POST /api/helitaxii/leads
// @access  Private (User)
exports.createLead = async (req, res) => {
  try {
    const { packageId, packageName, price, duration } = req.body;

    if (!packageId || !packageName) {
      return ApiResponse.badRequest(res, 'packageId and packageName are required');
    }

    const lead = await HeliTaxiiLead.create({
      user: req.user._id,
      packageId,
      packageName,
      price,
      duration,
    });

    return ApiResponse.success(res, 'HeliTaxii lead created', { lead });
  } catch (err) {
    console.error('Error creating Helitaxii lead:', err);
    return ApiResponse.serverError(res, 'Error creating Helitaxii lead', err);
  }
};

// @desc    Get all Helitaxii leads for admin
// @route   GET /api/admin/helitaxii/leads
// @access  Private (Admin)
exports.getLeadsAdmin = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [leads, total] = await Promise.all([
      HeliTaxiiLead.find({})
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      HeliTaxiiLead.countDocuments({}),
    ]);

    return ApiResponse.success(res, 'HeliTaxii leads retrieved', {
      leads,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('Error fetching Helitaxii leads:', err);
    return ApiResponse.serverError(res, 'Error fetching Helitaxii leads', err);
  }
};
