const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');

// Debug environment variables
console.log('Environment variables for Razorpay:');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay initialized successfully');
} catch (error) {
  console.error('Failed to initialize Razorpay:', error.message);
}

exports.createOrder = async (req, res) => {
  console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
  console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Loaded' : 'Not Loaded');
  try {
    const { amount, currency, receipt } = req.body;

    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send('Error creating Razorpay order');
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).send(error.message);
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    console.log('Payment verification request received:', req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing required payment parameters:', { 
        has_order_id: !!razorpay_order_id, 
        has_payment_id: !!razorpay_payment_id, 
        has_signature: !!razorpay_signature 
      });
      return res.status(400).json({ 
        success: false,
        message: 'Missing required payment parameters' 
      });
    }

    if (!bookingDetails) {
      console.error('Missing booking details in request');
      return res.status(400).json({ 
        success: false,
        message: 'Missing booking details' 
      });
    }

    console.log('Verifying payment signature with key secret:', !!process.env.RAZORPAY_KEY_SECRET);
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    console.log('Signature verification:', { 
      generated: digest.slice(0, 10) + '...', 
      received: razorpay_signature.slice(0, 10) + '...',
      match: digest === razorpay_signature
    });

    if (digest !== razorpay_signature) {
      console.error('Invalid payment signature');
      return res.status(400).json({ success: false, message: 'Transaction not legit!' });
    }

    // Payment is verified, now create the booking
    const { event, user, quantity, price, ticketType } = bookingDetails;

    // Create a new booking with required total field (was previously using totalAmount which is not in schema)
    const newBooking = new Booking({
        event: event._id,
        user: user.id,
        ticketType: ticketType,
        quantity: quantity,
        price: price,
        total: price * quantity, // Changed from totalAmount to total to match schema
        paymentStatus: 'completed', // Set payment status to completed since payment succeeded
        status: 'confirmed', // Set booking status to confirmed
        paymentId: razorpay_payment_id, // Store payment ID directly in the main document
        paymentDetails: {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            signature: razorpay_signature,
            paymentGateway: 'Razorpay',
            status: 'Paid'
        }
    });

    await newBooking.save();

    // Update event ticket count and ticket type sold
    await Event.updateOne(
      { _id: event._id, "ticketTypes.name": ticketType },
      {
        $inc: {
          "ticketTypes.$.sold": quantity,
          totalRevenue: price
        }
      }
    );
    
    // Fetch and save the event to trigger the pre-save hook that recalculates ticketsSold
    const updatedEvent = await Event.findById(event._id);
    if (updatedEvent) {
      await updatedEvent.save(); // This will recalculate ticketsSold based on ticketTypes.sold
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: newBooking,
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).send(error.message);
  }
};
