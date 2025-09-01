const AnnieBooking = require('../models/AnnieBooking');
const AnnieSeat = require('../models/AnnieSeat');
const mongoose = require('mongoose');

const unlockExpiredSeats = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expiredBookings = await AnnieBooking.find({
      status: 'pending',
      expiresAt: { $lt: new Date() },
    }).session(session);

    if (expiredBookings.length === 0) {
      // console.log('No expired bookings to clean up.');
      await session.abortTransaction();
      return;
    }

    console.log(`Found ${expiredBookings.length} expired bookings. Cleaning up...`);

    for (const booking of expiredBookings) {
      // Release the seats
      await AnnieSeat.updateMany(
        { _id: { $in: booking.seats } },
        { $set: { status: 'available' } },
        { session }
      );

      // Delete the expired booking
      await AnnieBooking.findByIdAndDelete(booking._id).session(session);
      console.log(`Released seats for expired booking ${booking._id}`);
    }

    await session.commitTransaction();
    console.log('Finished cleaning up expired bookings.');

  } catch (error) {
    await session.abortTransaction();
    console.error('Error during booking cleanup:', error);
  } finally {
    session.endSession();
  }
};

const start = () => {
  console.log('Booking cleanup service started. Will run every minute.');
  // Run every minute
  setInterval(unlockExpiredSeats, 60 * 1000);
};

module.exports = { start };
