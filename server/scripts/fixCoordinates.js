const mongoose = require('mongoose');
const Event = require('../models/Event');
require('dotenv').config();

async function fixCoordinates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ahibi');
    console.log('Connected to MongoDB');

    // Find all events with incomplete coordinates
    const events = await Event.find({
      'location.coordinates.type': 'Point',
      $or: [
        { 'location.coordinates.coordinates': { $exists: false } },
        { 'location.coordinates.coordinates': { $ne: { $type: 'array' } } },
        { 'location.coordinates.coordinates': { $size: 0 } }
      ]
    });

    console.log(`Found ${events.length} events with incomplete coordinates`);

    // Fix each event
    for (const event of events) {
      console.log(`Fixing coordinates for event: ${event.title} (${event._id})`);
      
      // Set default coordinates
      event.location.coordinates = {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates
      };

      await event.save();
      console.log(`Fixed coordinates for event: ${event.title}`);
    }

    console.log('All coordinates have been fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing coordinates:', error);
    process.exit(1);
  }
}

// Run the script
fixCoordinates();
