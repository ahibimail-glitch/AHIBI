const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
  kakiMarketingBranding: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: "Ahibi is powered by Kaki Marketing. For any marketing needs contact us at +91 88374 02472"
    },
    contactPhone: {
      type: String,
      default: "+91 88374 02472"
    },
    visibility: {
      arenaPartner: { type: Boolean, default: true },
      organizer: { type: Boolean, default: true },
      venue: { type: Boolean, default: true },
      sports: { type: Boolean, default: true },
      artist: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Create a singleton config - there should only be one document
SystemConfigSchema.statics.getConfig = async function() {
  console.log('Getting system config...');
  let config = await this.findOne();
  if (!config) {
    console.log('No config found, creating default config...');
    config = await this.create({});
    console.log('Default config created:', config);
  } else {
    console.log('Existing config found:', config);
  }
  return config;
};

SystemConfigSchema.statics.updateConfig = async function(updates) {
  console.log('Updating system config with:', updates);
  let config = await this.findOne();
  if (!config) {
    console.log('No config found during update, creating new one...');
    config = await this.create(updates);
  } else {
    console.log('Updating existing config...');
    config = await this.findOneAndUpdate({}, updates, { new: true, upsert: true });
  }
  console.log('Config updated to:', config);
  return config;
};

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
