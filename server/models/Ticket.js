const mongoose = require('mongoose');
const QRCode = require('qrcode');

const TicketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketType: {
    type: String,
    required: true
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  },
  discount: {
    code: {
      type: String
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  convenienceFee: {
    type: Number,
    default: 0
  },
  gst: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'upi', 'wallet', 'other']
  },
  qrCode: {
    type: String
  },
  isCheckedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date
  },
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refunded: {
    status: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      default: 0
    },
    date: {
      type: Date
    },
    reason: {
      type: String
    }
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'refunded'],
    default: 'active'
  }
});

// Generate QR Code for ticket before saving
TicketSchema.pre('save', async function(next) {
  // Only generate QR code if one doesn't exist already and payment is completed
  if (!this.qrCode && this.paymentStatus === 'completed') {
    try {
      // Create a data object with relevant ticket information
      const ticketData = {
        id: this._id,
        event: this.event,
        ticketNumber: this.ticketNumber,
        user: this.user
      };
      
      // Generate QR code as base64 string
      this.qrCode = await QRCode.toDataURL(JSON.stringify(ticketData));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }
  next();
});

// Generate unique ticket number
TicketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    // Format: EVT-{event_id last 6 chars}-{random 4 digits}-{timestamp last 4 digits}
    const eventId = this.event.toString().slice(-6);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString().slice(-4);
    
    this.ticketNumber = `EVT-${eventId}-${randomDigits}-${timestamp}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', TicketSchema);
