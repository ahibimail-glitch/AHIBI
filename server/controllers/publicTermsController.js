const SystemConfig = require('../models/SystemConfig');

// Get terms for a specific category (public endpoint)
const getPublicTermsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['organizer', 'venue', 'artist', 'sports'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const config = await SystemConfig.getConfig();
    const terms = config.termsAndConditions[category];
    
    res.json({
      success: true,
      data: terms
    });
  } catch (error) {
    console.error('Error fetching public terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms and conditions'
    });
  }
};

module.exports = {
  getPublicTermsByCategory
};
