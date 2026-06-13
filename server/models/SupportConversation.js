const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  message: {
    type: String,
    default: ''
  },
  attachments: [{
    url: String,
    filename: String,
    contentType: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SupportConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: String,
  userPhone: String,
  
  category: {
    type: String,
    enum: ['general', 'account', 'booking', 'payment', 'event', 'technical', 'other'],
    default: 'general'
  },
  
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active'
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  assignedToName: String,
  
  messages: [MessageSchema],
  
  lastMessage: {
    text: String,
    sender: String,
    createdAt: Date
  },
  
  lastRepliedBy: {
    type: String,
    enum: ['user', 'admin']
  },
  
  lastRepliedAt: {
    type: Date
  },
  
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Update lastMessage and timestamps before saving
SupportConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    const previewText = lastMsg.message?.trim()
      ? lastMsg.message.substring(0, 100)
      : lastMsg.attachments?.length
        ? '📎 Attachment'
        : '';
    this.lastMessage = {
      text: previewText,
      sender: lastMsg.senderName,
      createdAt: lastMsg.createdAt
    };
    this.lastRepliedAt = lastMsg.createdAt;
    this.lastRepliedBy = lastMsg.senderRole;
  }
  
  next();
});

module.exports = mongoose.model('SupportConversation', SupportConversationSchema);
