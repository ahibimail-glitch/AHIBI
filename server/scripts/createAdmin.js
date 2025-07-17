const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Load User model
const User = require('../models/User');

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@ahibi.in' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create new admin user
    const admin = new User({
      email: 'admin@ahibi.in',
      password: 'Ahibi@123', // This will be hashed by the pre-save hook
      name: 'Admin User',
      role: 'admin',
      status: 'active',
      phone: '0000000000', // Required field
      city: 'Admin City'   // Required field
    });

    // Save admin user (password will be hashed by pre-save hook)
    await admin.save();
    console.log('Admin user created successfully');
    
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}

createAdmin();
