const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const AnnieSeat = require('./models/AnnieSeat');

// Load env vars
require('dotenv').config();

// The seat configuration based on the provided image
const seatConfig = [
  // Premium Tier
  { row: 'X', count: 11, price: 1 },
  // Mid Tier
  { row: 'A', count: 12, price: 1200 },
  { row: 'B', count: 13, price: 1200 },
  { row: 'C', count: 13, price: 1200 },
  // Economy Tier
  { row: 'D', count: 13, price: 500 },
  { row: 'E', count: 13, price: 500 },
  { row: 'F', count: 13, price: 500 },
  { row: 'G', count: 13, price: 500 },
  { row: 'H', count: 13, price: 500 },
  { row: 'I', count: 13, price: 500 },
  { row: 'J', count: 13, price: 500 },
  { row: 'K', count: 11, price: 500 },
  { row: 'L', count: 11, price: 500 },
  { row: 'M', count: 11, price: 500 },
  { row: 'N', count: 14, price: 1 },
];

const seedSeats = async () => {
  try {
    await connectDB();

    console.log('Deleting existing seats...');
    await AnnieSeat.deleteMany({});
    console.log('Existing seats deleted.');

    const seatsToCreate = [];
    for (const config of seatConfig) {
      // Create all seats for each row sequentially
      for (let i = 1; i <= config.count * 2; i++) {
        seatsToCreate.push({
          row: config.row,
          number: i,
          price: config.price,
          status: 'available',
        });
      }
    }

    console.log(`Creating ${seatsToCreate.length} new seats...`);
    await AnnieSeat.insertMany(seatsToCreate);
    console.log('Seats have been successfully seeded!');

  } catch (error) {
    console.error('Error seeding seats:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

// Run the seeder
seedSeats();
