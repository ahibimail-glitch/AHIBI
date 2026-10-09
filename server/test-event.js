const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import Event model
const Event = require('./models/Event');

async function testEvent() {
  try {
    const eventId = 'wcew-57bc87';
    
    console.log(`Testing event ID: ${eventId}`);
    
    // Check if ObjectId is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log('❌ Invalid ObjectId format');
      
      // Try to find by slug
      console.log('🔍 Trying to find by slug...');
      const eventBySlug = await Event.findOne({ slug: eventId });
      if (eventBySlug) {
        console.log('✅ Event found by slug!');
        console.log(`Title: ${eventBySlug.title}`);
        console.log(`Status: ${eventBySlug.status}`);
        console.log(`_id: ${eventBySlug._id}`);
        console.log(`slug: ${eventBySlug.slug}`);
        return;
      }
      
      // Let's see what events exist
      const allEvents = await Event.find({}).select('_id title status slug').limit(10);
      console.log('\n📋 Recent events in database:');
      allEvents.forEach(e => {
        console.log(`- ${e._id}: "${e.title}" (status: ${e.status}, slug: ${e.slug})`);
      });
      
      return;
    }
    
    // Find the event
    const event = await Event.findById(eventId);
    
    if (!event) {
      console.log('❌ Event not found in database');
      
      // Let's see what events exist
      const allEvents = await Event.find({}).select('_id title status slug').limit(10);
      console.log('\n📋 Recent events in database:');
      allEvents.forEach(e => {
        console.log(`- ${e._id}: "${e.title}" (status: ${e.status}, slug: ${e.slug})`);
      });
      
      return;
    }
    
    console.log('✅ Event found!');
    console.log(`Title: ${event.title}`);
    console.log(`Status: ${event.status}`);
    console.log(`Approval Status: ${event.approvalStatus}`);
    console.log(`Organizer: ${event.organizer}`);
    console.log(`slug: ${event.slug}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testEvent();
