const mongoose = require('mongoose');

const teachingInquirySchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true,
    index: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeachingClass',
  },
  studentName: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: 100,
  },
  studentEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  studentPhone: {
    type: String,
    required: [true, 'Student phone is required'],
    trim: true,
  },
  message: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  preferredMode: {
    type: String,
    enum: ['online', 'offline'],
  },
  preferredDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'confirmed', 'completed', 'cancelled'],
    default: 'new',
    index: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
}, {
  timestamps: true,
});

teachingInquirySchema.index({ artistId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('TeachingInquiry', teachingInquirySchema);
