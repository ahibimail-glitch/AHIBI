const SystemConfig = require('../models/SystemConfig');
const { validationResult } = require('express-validator');

// Get all terms and conditions
const getAllTerms = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    res.json({
      success: true,
      data: config.termsAndConditions
    });
  } catch (error) {
    console.error('Error fetching terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms and conditions'
    });
  }
};

// Get terms for a specific category
const getTermsByCategory = async (req, res) => {
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
    console.error('Error fetching terms by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms and conditions'
    });
  }
};

// Update terms for a specific category
const updateTermsByCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { category } = req.params;
    const { heading, content } = req.body;
    const validCategories = ['organizer', 'venue', 'artist', 'sports'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const updateData = {};
    updateData[`termsAndConditions.${category}.heading`] = heading;
    updateData[`termsAndConditions.${category}.content`] = content;
    updateData[`termsAndConditions.${category}.lastUpdated`] = new Date();

    const config = await SystemConfig.updateConfig(updateData);
    
    res.json({
      success: true,
      message: `${category.charAt(0).toUpperCase() + category.slice(1)} terms and conditions updated successfully`,
      data: config.termsAndConditions[category]
    });
  } catch (error) {
    console.error('Error updating terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update terms and conditions'
    });
  }
};

// Update multiple categories at once
const updateMultipleTerms = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { terms } = req.body;
    const validCategories = ['organizer', 'venue', 'artist', 'sports'];
    const updateData = {};

    // Validate and prepare update data
    for (const [category, termData] of Object.entries(terms)) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category: ${category}`
        });
      }

      if (termData.heading && termData.content) {
        updateData[`termsAndConditions.${category}.heading`] = termData.heading;
        updateData[`termsAndConditions.${category}.content`] = termData.content;
        updateData[`termsAndConditions.${category}.lastUpdated`] = new Date();
      }
    }

    const config = await SystemConfig.updateConfig(updateData);
    
    res.json({
      success: true,
      message: 'Terms and conditions updated successfully',
      data: config.termsAndConditions
    });
  } catch (error) {
    console.error('Error updating multiple terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update terms and conditions'
    });
  }
};

module.exports = {
  getAllTerms,
  getTermsByCategory,
  updateTermsByCategory,
  updateMultipleTerms
};
