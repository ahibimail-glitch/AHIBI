const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ msg: 'Transaction not legit!' });
    }

    // Payment is verified, now create the booking
    const { event, user, quantity, price, ticketType } = bookingDetails;

    const newBooking = new Booking({
        event: event._id,
        user: user.id,
        ticketType: ticketType,
        quantity: quantity,
        price: price,
        totalAmount: price * quantity,
        paymentDetails: {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            signature: razorpay_signature,
            paymentGateway: 'Razorpay',
            status: 'Paid'
        }
    });

    await newBooking.save();

    // Update event ticket count
    await Event.findByIdAndUpdate(event._id, {
      $inc: { ticketsSold: quantity },
    });

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
