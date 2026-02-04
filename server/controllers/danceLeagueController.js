const DanceLeagueRegistration = require('../models/DanceLeagueRegistration');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const danceLeagueInvoiceService = require('../services/danceLeagueInvoiceService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create registration order
exports.createRegistrationOrder = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      dobDay,
      dobMonth,
      dobYear,
      address,
      city,
      state,
      zip,
      country,
      registrationType,
      danceStyle,
      otherStyle,
      groupName,
      numDancers,
      groupDanceStyle,
      groupOtherStyle,
      agreed
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !dobDay || !dobMonth || !dobYear || 
        !address || !city || !state || !zip || !country || !registrationType || !agreed) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required fields must be provided' 
      });
    }

    // Validate registration type specific fields
    if (registrationType === 'group' && (!groupName || !numDancers)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Group name and number of dancers are required for group registration' 
      });
    }

    // Calculate amount based on registration type
    const amount = registrationType === 'solo' ? 1000 : 1500;

    // Create date of birth
    const dateOfBirth = new Date(`${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `nedl_${Date.now()}`,
      notes: {
        fullName,
        email,
        registrationType
      }
    });

    // Create registration record with pending status
    const registration = new DanceLeagueRegistration({
      fullName,
      email,
      phone,
      dateOfBirth,
      address: {
        street: address,
        city,
        state,
        zip,
        country
      },
      registrationType,
      danceStyle: danceStyle || [],
      otherStyle: otherStyle || '',
      groupName: groupName || '',
      numDancers: numDancers || null,
      groupDanceStyle: groupDanceStyle || [],
      groupOtherStyle: groupOtherStyle || '',
      amount,
      paymentStatus: 'pending',
      razorpayOrderId: razorpayOrder.id,
      agreedToTerms: agreed,
      status: 'pending'
    });

    await registration.save();

    res.status(201).json({
      success: true,
      message: 'Registration order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        registrationId: registration._id
      }
    });

  } catch (error) {
    console.error('Error creating registration order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create registration order',
      error: error.message
    });
  }
};

// Verify payment and confirm registration
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      registrationId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification details'
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update registration with payment details
    const registration = await DanceLeagueRegistration.findById(registrationId);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    registration.paymentStatus = 'confirmed';
    registration.razorpayPaymentId = razorpay_payment_id;
    registration.razorpaySignature = razorpay_signature;
    registration.transactionId = razorpay_payment_id;

    await registration.save();

    // Generate invoice
    try {
      const invoiceData = await danceLeagueInvoiceService.generateInvoice(registration);
      registration.invoicePdf = invoiceData.buffer;
      registration.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
      registration.invoiceGeneratedAt = new Date();
      registration.invoiceUrl = `/api/dance-league/invoice/${registration.invoiceNumber}`;
      await registration.save();
    } catch (invoiceError) {
      console.error('Error generating invoice:', invoiceError);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and registration confirmed successfully',
      data: {
        registrationNumber: registration.registrationNumber,
        invoiceNumber: registration.invoiceNumber,
        invoiceUrl: registration.invoiceUrl,
        registration: {
          id: registration._id,
          fullName: registration.fullName,
          email: registration.email,
          registrationType: registration.registrationType,
          amount: registration.amount,
          status: registration.status
        }
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Razorpay webhook handler
exports.handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ success: false, message: 'Webhook not configured' });
    }

    // Verify webhook signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    if (event === 'payment.captured') {
      const orderId = payload.order_id;
      const paymentId = payload.id;

      const registration = await DanceLeagueRegistration.findOne({ razorpayOrderId: orderId });

      if (registration && registration.paymentStatus === 'pending') {
        registration.paymentStatus = 'confirmed';
        registration.razorpayPaymentId = paymentId;
        registration.transactionId = paymentId;
        await registration.save();

        // Generate invoice
        try {
          const invoiceData = await danceLeagueInvoiceService.generateInvoice(registration);
          registration.invoicePdf = invoiceData.buffer;
          registration.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
          registration.invoiceGeneratedAt = new Date();
          registration.invoiceUrl = `/api/dance-league/invoice/${registration.invoiceNumber}`;
          await registration.save();
        } catch (invoiceError) {
          console.error('Error generating invoice via webhook:', invoiceError);
        }
      }
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// Get registration by ID
exports.getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await DanceLeagueRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Only return confirmed registrations
    if (registration.paymentStatus !== 'confirmed') {
      return res.status(404).json({
        success: false,
        message: 'Registration not confirmed. Please complete payment.'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });

  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration',
      error: error.message
    });
  }
};

// Get registration by registration number
exports.getRegistrationByNumber = async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    const registration = await DanceLeagueRegistration.findOne({ 
      registrationNumber,
      paymentStatus: 'confirmed'
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });

  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration',
      error: error.message
    });
  }
};

// Download invoice
exports.downloadInvoice = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    const registration = await DanceLeagueRegistration.findOne({
      invoiceNumber,
      paymentStatus: 'confirmed'
    }).select('+invoicePdf');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // If buffer missing (older records), regenerate and persist
    if (!registration.invoicePdf) {
      try {
        const invoiceData = await danceLeagueInvoiceService.generateInvoice(registration);
        registration.invoicePdf = invoiceData.buffer;
        registration.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
        registration.invoiceGeneratedAt = new Date();
        registration.invoiceUrl = `/api/dance-league/invoice/${registration.invoiceNumber}`;
        await registration.save();
      } catch (regenError) {
        console.error('Error regenerating invoice:', regenError);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate invoice'
        });
      }
    }

    res.setHeader('Content-Type', registration.invoicePdfContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    return res.status(200).send(registration.invoicePdf);

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download invoice',
      error: error.message
    });
  }
};

// Admin: Get all registrations
exports.getAllRegistrations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      registrationType = '',
      paymentStatus = 'confirmed'
    } = req.query;

    const query = { paymentStatus };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (registrationType) {
      query.registrationType = registrationType;
    }

    const registrations = await DanceLeagueRegistration.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await DanceLeagueRegistration.countDocuments(query);

    // Calculate statistics
    const stats = await DanceLeagueRegistration.aggregate([
      { $match: { paymentStatus: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          soloCount: {
            $sum: { $cond: [{ $eq: ['$registrationType', 'solo'] }, 1, 0] }
          },
          groupCount: {
            $sum: { $cond: [{ $eq: ['$registrationType', 'group'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        registrations,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalRegistrations: count,
        stats: stats[0] || {
          totalRegistrations: 0,
          totalRevenue: 0,
          soloCount: 0,
          groupCount: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations',
      error: error.message
    });
  }
};

// Admin: Get registration statistics
exports.getStatistics = async (req, res) => {
  try {
    const stats = await DanceLeagueRegistration.aggregate([
      { $match: { paymentStatus: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          soloCount: {
            $sum: { $cond: [{ $eq: ['$registrationType', 'solo'] }, 1, 0] }
          },
          groupCount: {
            $sum: { $cond: [{ $eq: ['$registrationType', 'group'] }, 1, 0] }
          },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Get registrations by date
    const registrationsByDate = await DanceLeagueRegistration.aggregate([
      { $match: { paymentStatus: 'confirmed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$registrationDate' } },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalRegistrations: 0,
          totalRevenue: 0,
          soloCount: 0,
          groupCount: 0,
          avgAmount: 0
        },
        registrationsByDate
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
