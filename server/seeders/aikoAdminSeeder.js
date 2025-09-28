const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const AikoHallAdmin = require('../models/AikoHallAdmin');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {});

const seedAdmin = async () => {
  try {
    // Check if an admin already exists
    const existingAdmin = await AikoHallAdmin.findOne({ email: 'aikoadmin@ahibi.in' });

    if (existingAdmin) {
      console.log('Aiko Hall admin already exists. No action taken.');
      process.exit();
    }

    // Create a new admin
    const admin = await AikoHallAdmin.create({
      email: 'aikoadmin@ahibi.in',
      password: 'AikoHallAdminPassword123' // This will be hashed by the model pre-save hook
    });

    console.log('Aiko Hall admin created successfully!');
    console.log('Email: aikoadmin@ahibi.in');
    console.log('Password: AikoHallAdminPassword123');

    process.exit();
  } catch (error) {
    console.error('Error seeding Aiko Hall admin:', error);
    process.exit(1);
  }
};

seedAdmin();
