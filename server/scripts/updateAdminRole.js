require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const updateAdminRole = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Update all admin documents to include the role field
    const result = await Admin.updateMany(
      { role: { $exists: false } }, // Only update if role doesn't exist
      { $set: { role: 'admin' } }
    );

    console.log('Updated admin records:', result);
    
    // Verify the update
    const admins = await Admin.find({});
    console.log('Current admin records:', admins);

    process.exit(0);
  } catch (error) {
    console.error('Error updating admin roles:', error);
    process.exit(1);
  }
};

updateAdminRole();
