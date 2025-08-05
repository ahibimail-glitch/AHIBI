const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const smsService = require('../services/smsService');
const QRCode = require('qrcode'); // Import QRCode library
const emailService = require('../services/emailService');

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

    // Payment is verified, now create individual bookings for each ticket
    const { event, user, tickets } = bookingDetails;

    // Create individual bookings for each ticket type and quantity
    const bookings = [];
    const bookingIds = [];
    let totalTickets = 0;
    let currentTicketIndex = 1;

    // Process each ticket type
    for (const ticketInfo of tickets) {
        const { ticketType, quantity, price } = ticketInfo;
        
        // Create individual bookings for each ticket of this type
        for (let i = 0; i < quantity; i++) {
            // Create a new booking for each individual ticket
            const newBooking = new Booking({
                event: event._id,
                user: user.id,
                ticketType: ticketType,
                quantity: 1, // Each booking is for 1 ticket
                price: price,
                total: price, // Total is same as price for individual ticket
                paymentStatus: 'completed',
                status: 'confirmed',
                paymentId: razorpay_payment_id,
                paymentDetails: {
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    signature: razorpay_signature,
                    paymentGateway: 'Razorpay',
                    status: 'Paid'
                },
                // Add ticket-specific information
                ticketIndex: currentTicketIndex,
                totalTickets: tickets.reduce((sum, t) => sum + t.quantity, 0),
                parentBookingId: null // Will be set to the first booking ID
            });

            await newBooking.save();
            bookings.push(newBooking);
            bookingIds.push(newBooking._id);
            currentTicketIndex++;
            totalTickets++;
        }

        // Update event ticket count and ticket type sold
        await Event.updateOne(
            { _id: event._id, "ticketTypes.name": ticketType },
            {
                $inc: {
                    "ticketTypes.$.sold": quantity,
                    totalRevenue: price * quantity
                }
            }
        );
    }

    // Set the parent booking ID to the first booking for all tickets
    if (bookings.length > 0) {
        const parentBookingId = bookings[0]._id;
        for (let i = 1; i < bookings.length; i++) {
            bookings[i].parentBookingId = parentBookingId;
            await bookings[i].save();
        }
    }
    
    // Fetch and save the event to trigger the pre-save hook that recalculates ticketsSold
    const updatedEvent = await Event.findById(event._id);
    if (updatedEvent) {
        await updatedEvent.save(); // This will recalculate ticketsSold based on ticketTypes.sold
    }

    // Send booking confirmation SMS and email
    try {
      console.log('[Payment] Starting ticket notification process');
      
      // Send ticket via SMS if phone number is available
      if (user.phone) {
        console.log('[Payment] Preparing to send SMS to:', user.phone);
        
        // Format date for SMS
        const eventDate = updatedEvent.startDate ? 
          new Date(updatedEvent.startDate).toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }) : 'TBA';
        
        // Prepare ticket details for SMS
        const ticketDetails = {
          bookingId: bookings[0]._id, // Use first booking ID for SMS
          eventName: updatedEvent.title,
          ticketType: tickets.map(t => `${t.ticketType} (${t.quantity})`).join(', '),
          quantity: totalTickets,
          eventDate: eventDate
        };
        
        console.log('[Payment] Sending ticket details via SMS:', ticketDetails);
        
        // Send booking confirmation SMS
        await smsService.sendBookingConfirmation(
          user.phone, 
          updatedEvent.title, 
          bookings[0]._id.toString(),
          ticketDetails.ticketType,
          totalTickets
        );
        
        // Also send detailed ticket SMS
        try {
          const smsResult = await smsService.sendTicket(user.phone, ticketDetails);
          console.log('[Payment] SMS result:', smsResult);
        } catch (smsError) {
          console.error('[Payment] SMS sending error:', smsError);
        }
      } else {
        console.log('[Payment] Cannot send SMS - no valid phone number found');
      }
      
      // Send ticket via email with QR code if email is available
      if (user.email) {
        console.log('[Payment] Sending ticket via email to:', user.email);
        try {
          await emailService.sendTicketEmail(
            user.email,
            user.name || 'Customer',
            {
              eventName: updatedEvent.title,
              eventDate: updatedEvent.startDate ? new Date(updatedEvent.startDate).toLocaleDateString() : 'TBA',
              eventTime: updatedEvent.startDate ? new Date(updatedEvent.startDate).toLocaleTimeString() : 'TBA',
              ticketType: tickets.map(t => `${t.ticketType} (${t.quantity})`).join(', '),
              quantity: totalTickets,
              bookingId: bookings[0]._id, // Use first booking ID for email
              qrCode: null // Will be generated per ticket
            }
          );
          console.log('[Payment] Ticket email sent successfully');
        } catch (emailError) {
          console.error('[Payment] Failed to send ticket email:', emailError);
        }
      }
    } catch (notificationError) {
      console.error('[Payment] Error sending booking notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Bookings created successfully',
      booking: bookings[0], // Return first booking for backward compatibility
      allBookings: bookings, // Return all bookings for new functionality
      bookingIds: bookingIds, // Return all booking IDs
      totalTickets: totalTickets,
      ticketTypes: tickets.map(t => ({ type: t.ticketType, quantity: t.quantity, price: t.price }))
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).send(error.message);
  }
};
