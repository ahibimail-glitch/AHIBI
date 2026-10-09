const Donation = require('../models/Donation');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create donation order
exports.createDonationOrder = async (req, res) => {
  try {
    const { donorName, email, phone, amount, message, isAnonymous } = req.body;

    // Validation
    if (!donorName || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Donor name and amount are required'
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum donation amount is ₹1'
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `donation_${Date.now()}`,
      notes: {
        donorName,
        campaign: 'The Awakening'
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Create donation record
    const donation = new Donation({
      donorName,
      email: email || undefined,
      phone: phone || undefined,
      amount,
      message: message || undefined,
      campaign: 'The Awakening',
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'pending',
      isAnonymous: isAnonymous || false
    });

    await donation.save();

    res.status(201).json({
      success: true,
      message: 'Donation order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        donationId: donation._id
      }
    });
  } catch (error) {
    console.error('Error creating donation order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donation order',
      error: error.message
    });
  }
};

// Verify donation payment
exports.verifyDonationPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update donation record
    const donation = await Donation.findOne({ razorpayOrderId: razorpay_order_id });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    donation.paymentStatus = 'completed';
    donation.razorpayPaymentId = razorpay_payment_id;
    donation.razorpaySignature = razorpay_signature;
    donation.transactionId = razorpay_payment_id;

    await donation.save();

    res.status(200).json({
      success: true,
      message: 'Donation completed successfully',
      data: {
        donationId: donation._id,
        amount: donation.amount,
        donorName: donation.donorName
      }
    });
  } catch (error) {
    console.error('Error verifying donation payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Razorpay webhook handler
exports.handleDonationWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ success: false });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ success: false });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    if (event === 'payment.captured') {
      const donation = await Donation.findOne({ razorpayOrderId: payload.order_id });

      if (donation && donation.paymentStatus === 'pending') {
        donation.paymentStatus = 'completed';
        donation.razorpayPaymentId = payload.id;
        donation.transactionId = payload.id;
        donation.paymentMethod = payload.method;
        await donation.save();

        console.log(`Donation ${donation._id} marked as completed via webhook`);
      }
    } else if (event === 'payment.failed') {
      const donation = await Donation.findOne({ razorpayOrderId: payload.order_id });

      if (donation && donation.paymentStatus === 'pending') {
        donation.paymentStatus = 'failed';
        await donation.save();

        console.log(`Donation ${donation._id} marked as failed via webhook`);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling donation webhook:', error);
    res.status(500).json({ success: false });
  }
};

// Get all donations (Admin)
exports.getAdminDonations = async (req, res) => {
  try {
    const { status, startDate, endDate, search } = req.query;

    let query = { paymentStatus: 'completed' };

    // Filter by status if provided
    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search by donor name or email
    if (search) {
      query.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const donations = await Donation.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Calculate statistics
    const stats = await Donation.aggregate([
      { $match: { paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalDonations: { $sum: 1 },
          averageDonation: { $avg: '$amount' }
        }
      }
    ]);

    const statistics = stats.length > 0 ? stats[0] : {
      totalAmount: 0,
      totalDonations: 0,
      averageDonation: 0
    };

    res.status(200).json({
      success: true,
      data: {
        donations,
        statistics: {
          totalAmount: statistics.totalAmount || 0,
          totalDonations: statistics.totalDonations || 0,
          averageDonation: Math.round(statistics.averageDonation || 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
};

// Get donation statistics
exports.getDonationStats = async (req, res) => {
  try {
    const stats = await Donation.aggregate([
      { $match: { paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalDonations: { $sum: 1 },
          averageDonation: { $avg: '$amount' }
        }
      }
    ]);

    const recentDonations = await Donation.find({ paymentStatus: 'completed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('donorName amount createdAt isAnonymous')
      .lean();

    const statistics = stats.length > 0 ? stats[0] : {
      totalAmount: 0,
      totalDonations: 0,
      averageDonation: 0
    };

    res.status(200).json({
      success: true,
      data: {
        totalAmount: statistics.totalAmount || 0,
        totalDonations: statistics.totalDonations || 0,
        averageDonation: Math.round(statistics.averageDonation || 0),
        recentDonations: recentDonations.map(d => ({
          donorName: d.isAnonymous ? 'Anonymous' : d.donorName,
          amount: d.amount,
          date: d.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
