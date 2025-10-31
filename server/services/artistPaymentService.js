const ArtistBooking = require('../models/ArtistBooking');
const Artist = require('../models/Artist');
const PaymentTransaction = require('../models/PaymentTransaction');
const ArtistNotificationService = require('./artistNotificationService');

class ArtistPaymentService {
  /**
   * Process advance payment for artist booking
   * @param {string} bookingId - Booking ID
   * @param {Object} paymentData - Payment data from payment gateway
   * @returns {Object} Payment processing result
   */
  static async processAdvancePayment(bookingId, paymentData) {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name email phone');

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.booking.status !== 'accepted') {
        throw new Error('Booking must be accepted before payment can be processed');
      }

      // Calculate advance amount (typically 50% of final amount)
      const finalAmount = booking.booking.finalAmount || booking.booking.requestedAmount;
      const advanceAmount = Math.round(finalAmount * 0.5);

      // Create payment transaction record
      const paymentTransaction = new PaymentTransaction({
        bookingId: booking._id,
        bookingType: 'artist',
        amount: advanceAmount,
        paymentMethod: paymentData.method || 'online',
        transactionId: paymentData.transactionId,
        paymentGateway: paymentData.gateway || 'razorpay',
        status: 'completed',
        paymentDetails: paymentData
      });

      await paymentTransaction.save();

      // Update booking payment status
      booking.booking.advanceAmount = advanceAmount;
      booking.booking.remainingAmount = finalAmount - advanceAmount;
      booking.booking.paymentStatus = 'advance_paid';
      booking.booking.status = 'confirmed';

      // Add timeline entry
      booking.addTimelineEntry(
        'Advance payment received',
        'organizer',
        `Advance payment of ₹${advanceAmount} received`
      );

      await booking.save();

      // Update artist earnings
      await this.updateArtistEarnings(booking.artist._id, advanceAmount);

      // Send notification to artist
      await ArtistNotificationService.notifyPaymentReceived(
        bookingId,
        advanceAmount,
        'advance'
      );

      return {
        success: true,
        booking,
        paymentTransaction,
        message: 'Advance payment processed successfully'
      };

    } catch (error) {
      console.error('Error processing advance payment:', error);
      throw error;
    }
  }

  /**
   * Process full payment for artist booking
   * @param {string} bookingId - Booking ID
   * @param {Object} paymentData - Payment data from payment gateway
   * @returns {Object} Payment processing result
   */
  static async processFullPayment(bookingId, paymentData) {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name email phone');

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.booking.paymentStatus !== 'advance_paid') {
        throw new Error('Advance payment must be completed before full payment');
      }

      const remainingAmount = booking.booking.remainingAmount;

      // Create payment transaction record
      const paymentTransaction = new PaymentTransaction({
        bookingId: booking._id,
        bookingType: 'artist',
        amount: remainingAmount,
        paymentMethod: paymentData.method || 'online',
        transactionId: paymentData.transactionId,
        paymentGateway: paymentData.gateway || 'razorpay',
        status: 'completed',
        paymentDetails: paymentData
      });

      await paymentTransaction.save();

      // Update booking payment status
      booking.booking.paymentStatus = 'fully_paid';
      booking.booking.remainingAmount = 0;

      // Add timeline entry
      booking.addTimelineEntry(
        'Full payment received',
        'organizer',
        `Remaining payment of ₹${remainingAmount} received`
      );

      await booking.save();

      // Update artist earnings
      await this.updateArtistEarnings(booking.artist._id, remainingAmount);

      // Send notification to artist
      await ArtistNotificationService.notifyPaymentReceived(
        bookingId,
        remainingAmount,
        'full'
      );

      return {
        success: true,
        booking,
        paymentTransaction,
        message: 'Full payment processed successfully'
      };

    } catch (error) {
      console.error('Error processing full payment:', error);
      throw error;
    }
  }

  /**
   * Process refund for cancelled booking
   * @param {string} bookingId - Booking ID
   * @param {number} refundAmount - Amount to refund
   * @param {string} reason - Refund reason
   * @returns {Object} Refund processing result
   */
  static async processRefund(bookingId, refundAmount, reason) {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name email phone');

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.booking.status !== 'cancelled') {
        throw new Error('Booking must be cancelled before refund can be processed');
      }

      // Create refund transaction record
      const refundTransaction = new PaymentTransaction({
        bookingId: booking._id,
        bookingType: 'artist',
        amount: -refundAmount, // Negative amount for refund
        paymentMethod: 'refund',
        transactionId: `refund_${Date.now()}`,
        status: 'completed',
        paymentDetails: { reason }
      });

      await refundTransaction.save();

      // Update booking payment status
      booking.booking.paymentStatus = 'refunded';

      // Add timeline entry
      booking.addTimelineEntry(
        'Refund processed',
        'admin',
        `Refund of ₹${refundAmount} processed. Reason: ${reason}`
      );

      await booking.save();

      // Update artist earnings (deduct refunded amount)
      await this.updateArtistEarnings(booking.artist._id, -refundAmount);

      return {
        success: true,
        booking,
        refundTransaction,
        message: 'Refund processed successfully'
      };

    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Update artist total earnings
   * @param {string} artistId - Artist ID
   * @param {number} amount - Amount to add/subtract
   */
  static async updateArtistEarnings(artistId, amount) {
    try {
      const artist = await Artist.findById(artistId);
      if (artist) {
        artist.totalEarnings = (artist.totalEarnings || 0) + amount;
        await artist.save();
      }
    } catch (error) {
      console.error('Error updating artist earnings:', error);
    }
  }

  /**
   * Get artist payment history
   * @param {string} artistId - Artist ID
   * @param {Object} options - Query options
   * @returns {Array} Payment history
   */
  static async getPaymentHistory(artistId, options = {}) {
    try {
      const { page = 1, limit = 10, startDate, endDate } = options;

      // Get all bookings for the artist
      let bookingQuery = { artist: artistId };
      
      if (startDate && endDate) {
        bookingQuery.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const bookings = await ArtistBooking.find(bookingQuery)
        .populate('organizer', 'name companyName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Get payment transactions for these bookings
      const bookingIds = bookings.map(b => b._id);
      const transactions = await PaymentTransaction.find({
        bookingId: { $in: bookingIds },
        bookingType: 'artist'
      });

      // Combine booking and transaction data
      const paymentHistory = bookings.map(booking => {
        const bookingTransactions = transactions.filter(t => 
          t.bookingId.toString() === booking._id.toString()
        );

        return {
          bookingId: booking._id,
          eventName: booking.event.name,
          eventDate: booking.event.date,
          organizer: booking.organizer,
          totalAmount: booking.booking.finalAmount || booking.booking.requestedAmount,
          advanceAmount: booking.booking.advanceAmount || 0,
          remainingAmount: booking.booking.remainingAmount || 0,
          paymentStatus: booking.booking.paymentStatus,
          bookingStatus: booking.booking.status,
          transactions: bookingTransactions,
          createdAt: booking.createdAt
        };
      });

      const total = await ArtistBooking.countDocuments(bookingQuery);

      return {
        paymentHistory,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      };

    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Get artist earnings summary
   * @param {string} artistId - Artist ID
   * @param {Object} dateRange - Date range filter
   * @returns {Object} Earnings summary
   */
  static async getEarningsSummary(artistId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let bookingQuery = { 
        artist: artistId,
        'booking.paymentStatus': { $in: ['advance_paid', 'fully_paid'] }
      };
      
      if (startDate && endDate) {
        bookingQuery['event.date'] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const bookings = await ArtistBooking.find(bookingQuery);

      let totalEarnings = 0;
      let advanceReceived = 0;
      let fullPaymentReceived = 0;
      let pendingAmount = 0;

      bookings.forEach(booking => {
        const finalAmount = booking.booking.finalAmount || booking.booking.requestedAmount || 0;
        
        if (booking.booking.paymentStatus === 'fully_paid') {
          totalEarnings += finalAmount;
          fullPaymentReceived += finalAmount;
        } else if (booking.booking.paymentStatus === 'advance_paid') {
          const advance = booking.booking.advanceAmount || 0;
          const remaining = booking.booking.remainingAmount || 0;
          
          totalEarnings += advance;
          advanceReceived += advance;
          pendingAmount += remaining;
        }
      });

      // Get monthly earnings breakdown
      const monthlyEarnings = this.calculateMonthlyEarnings(bookings);

      return {
        totalEarnings,
        advanceReceived,
        fullPaymentReceived,
        pendingAmount,
        totalBookings: bookings.length,
        monthlyEarnings
      };

    } catch (error) {
      console.error('Error calculating earnings summary:', error);
      throw error;
    }
  }

  /**
   * Calculate monthly earnings breakdown
   * @param {Array} bookings - Array of bookings
   * @returns {Array} Monthly earnings data
   */
  static calculateMonthlyEarnings(bookings) {
    const monthlyData = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          earnings: 0,
          bookings: 0
        };
      }
      
      const amount = booking.booking.paymentStatus === 'fully_paid' 
        ? (booking.booking.finalAmount || booking.booking.requestedAmount || 0)
        : (booking.booking.advanceAmount || 0);
      
      monthlyData[monthKey].earnings += amount;
      monthlyData[monthKey].bookings++;
    });
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Generate payment invoice for booking
   * @param {string} bookingId - Booking ID
   * @returns {Object} Invoice data
   */
  static async generatePaymentInvoice(bookingId) {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name email phone companyName');

      if (!booking) {
        throw new Error('Booking not found');
      }

      const transactions = await PaymentTransaction.find({
        bookingId: booking._id,
        bookingType: 'artist',
        status: 'completed'
      });

      const invoice = {
        invoiceNumber: `INV-${booking._id.toString().slice(-8).toUpperCase()}`,
        bookingId: booking._id,
        artist: {
          name: booking.artist.name,
          email: booking.artist.email,
          phone: booking.artist.phone
        },
        organizer: {
          name: booking.organizer.name,
          company: booking.organizer.companyName,
          email: booking.organizer.email,
          phone: booking.organizer.phone
        },
        event: {
          name: booking.event.name,
          date: booking.event.date,
          time: `${booking.event.startTime} - ${booking.event.endTime}`,
          venue: `${booking.event.venue.name}, ${booking.event.venue.address}`,
          duration: booking.event.duration
        },
        payment: {
          totalAmount: booking.booking.finalAmount || booking.booking.requestedAmount,
          advanceAmount: booking.booking.advanceAmount || 0,
          remainingAmount: booking.booking.remainingAmount || 0,
          paymentStatus: booking.booking.paymentStatus
        },
        transactions: transactions.map(t => ({
          transactionId: t.transactionId,
          amount: t.amount,
          method: t.paymentMethod,
          gateway: t.paymentGateway,
          date: t.createdAt
        })),
        generatedAt: new Date()
      };

      return invoice;

    } catch (error) {
      console.error('Error generating payment invoice:', error);
      throw error;
    }
  }
}

module.exports = ArtistPaymentService;
