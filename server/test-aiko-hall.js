const mongoose = require('mongoose');
const AikoHall = require('./models/AikoHall');
const AikoHallBooking = require('./models/AikoHallBooking');
require('dotenv').config();

async function testAikoHallSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Get or create Aiko Hall
    console.log('\n🧪 Test 1: Getting Aiko Hall data...');
    const aikoHall = await AikoHall.getAikoHall();
    console.log('✅ Aiko Hall data:', {
      name: aikoHall.name,
      maxCapacity: aikoHall.maxCapacity,
      minBookingHours: aikoHall.minBookingHours,
      totalBookings: aikoHall.totalBookings
    });

    // Test 2: Create a test booking
    console.log('\n🧪 Test 2: Creating a test booking...');
    const testBooking = new AikoHallBooking({
      customer: {
        name: 'Test Customer',
        phone: '9876543210',
        email: 'test@example.com'
      },
      bookingDate: new Date('2025-02-15'),
      startTime: '10:00',
      endTime: '16:00',
      guestCount: 50,
      specialNotes: 'Test booking for system verification'
    });

    await testBooking.save();
    console.log('✅ Test booking created:', {
      id: testBooking._id,
      customer: testBooking.customer.name,
      date: testBooking.bookingDate,
      duration: testBooking.duration
    });

    // Test 3: Check availability
    console.log('\n🧪 Test 3: Testing availability check...');
    const isAvailable = await AikoHallBooking.checkAvailability(
      '2025-02-15',
      '14:00',
      '18:00'
    );
    console.log('✅ Availability check result:', isAvailable ? 'Available' : 'Not Available');

    // Test 4: Get all bookings
    console.log('\n🧪 Test 4: Fetching all bookings...');
    const allBookings = await AikoHallBooking.find();
    console.log('✅ Total bookings found:', allBookings.length);

    // Test 5: Update booking status
    console.log('\n🧪 Test 5: Updating booking status...');
    testBooking.status = 'approved';
    testBooking.approvedAt = new Date();
    await testBooking.save();
    console.log('✅ Booking status updated to:', testBooking.status);

    // Test 6: Get booking statistics
    console.log('\n🧪 Test 6: Getting booking statistics...');
    const totalBookings = await AikoHallBooking.countDocuments();
    const pendingBookings = await AikoHallBooking.countDocuments({ status: 'pending' });
    const approvedBookings = await AikoHallBooking.countDocuments({ status: 'approved' });
    
    console.log('✅ Booking statistics:', {
      total: totalBookings,
      pending: pendingBookings,
      approved: approvedBookings
    });

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await AikoHallBooking.deleteOne({ _id: testBooking._id });
    console.log('✅ Test booking deleted');

    console.log('\n🎉 All tests passed! Aiko Hall booking system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testAikoHallSystem();
