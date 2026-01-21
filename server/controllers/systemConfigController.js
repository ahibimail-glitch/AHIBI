const SystemConfig = require('../models/SystemConfig');

// Get system configuration
exports.getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching system config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system configuration'
    });
  }
};

// Update system configuration
exports.updateSystemConfig = async (req, res) => {
  try {
    console.log('Updating system config with:', req.body);
    const updates = req.body;
    const config = await SystemConfig.updateConfig(updates);
    console.log('Config updated successfully:', config);
    
    res.json({
      success: true,
      data: config,
      message: 'System configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system configuration',
      error: error.message
    });
  }
};

// Get Kaki Marketing branding settings for public use
exports.getKakiMarketingBranding = async (req, res) => {
  try {
    console.log('Fetching Kaki Marketing branding settings...');
    const config = await SystemConfig.getConfig();
    console.log('System config found:', config);
    const branding = config.kakiMarketingBranding;
    
    res.json({
      success: true,
      data: {
        enabled: branding?.enabled || false,
        message: branding?.message || "Ahibi is powered by Kaki Marketing. For any marketing needs contact us at +91 88374 02472",
        contactPhone: branding?.contactPhone || "+91 88374 02472",
        visibility: branding?.visibility || {
          arenaPartner: true,
          organizer: true,
          venue: true,
          sports: true,
          artist: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branding settings',
      error: error.message
    });
  }
};
