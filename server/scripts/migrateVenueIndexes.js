/**
 * Migration: Update Venue indexes for multi-venue support
 * Child venues can now share parent's email/phone.
 * Run: node scripts/migrateVenueIndexes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Venue = require('../models/Venue');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function migrate() {
  if (!MONGO_URI) {
    console.error('MONGO_URI or MONGODB_URI not set in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('venues');

    // Drop old unique indexes on email and phone (if they exist)
    for (const idxName of ['email_1', 'phone_1']) {
      try {
        await collection.dropIndex(idxName);
        console.log('Dropped index:', idxName);
      } catch (e) {
        if (e.code === 27 || e.codeName === 'IndexNotFound') {
          console.log('Index', idxName, 'did not exist (ok)');
        } else {
          console.warn('Could not drop', idxName, ':', e.message);
        }
      }
    }

    // Ensure new partial indexes exist
    await Venue.syncIndexes();
    console.log('Venue indexes migrated successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
