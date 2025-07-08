const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  attachments: [{
    url: {
      type: String
    },
    filename: {
      type: String
    },
    contentType: {
      type: String
    }
  }],
  isStaff: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SupportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required']
  },
  category: {
    type: String,
    enum: ['general', 'account', 'booking', 'payment', 'event', 'technical', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Event', 'Booking', 'Payment', 'User']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  messages: [MessageSchema],
  lastRepliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastRepliedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique ticket ID before saving
SupportTicketSchema.pre('save', async function(next) {
  // Only generate ticket ID for new tickets
  if (!this.ticketId) {
    const prefix = 'SUP';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    
    this.ticketId = `${prefix}-${timestamp}-${random}`;
  }
  
  // Update updatedAt timestamp
  this.updatedAt = Date.now();
  
  // Update lastRepliedAt if there are messages
  if (this.messages && this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1];
    this.lastRepliedAt = lastMessage.createdAt;
    this.lastRepliedBy = lastMessage.sender;
  }
  
  next();
});

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
