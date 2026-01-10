const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
  // Court Reference
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: [true, 'Court is required']
  },
  
  // Venue Reference (for quick access)
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SportsVenue',
    required: [true, 'Venue is required']
  },
  
  // Date
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  
  // Time Range
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  
  // Duration in minutes
  duration: {
    type: Number,
    required: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  
  // Status
  status: {
    type: String,
    enum: ['available', 'booked', 'held', 'blocked'],
    default: 'available'
  },
  
  // Booking Reference (if booked)
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SportsBooking'
  },
  
  // Hold Information (for checkout process)
  heldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  heldAt: {
    type: Date
  },
  holdExpiry: {
    type: Date
  },
  
  // Blocked Information
  blockedReason: {
    type: String
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArenaPartner'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before saving
TimeSlotSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate duration from start and end time
TimeSlotSchema.pre('save', function(next) {
  if (this.startTime && this.endTime && !this.duration) {
    const start = new Date(`2000-01-01T${this.startTime}:00`);
    const end = new Date(`2000-01-01T${this.endTime}:00`);
    
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    this.duration = (end - start) / (1000 * 60); // Convert to minutes
  }
  next();
});

// Static method to hold a slot during checkout
TimeSlotSchema.statics.holdSlot = async function(slotId, userId, holdDuration = 10) {
  const slot = await this.findById(slotId);
  
  if (!slot) {
    throw new Error('Slot not found');
  }
  
  if (slot.status !== 'available') {
    throw new Error('Slot is not available');
  }
  
  slot.status = 'held';
  slot.heldBy = userId;
  slot.heldAt = Date.now();
  slot.holdExpiry = Date.now() + (holdDuration * 60 * 1000); // holdDuration in minutes
  
  await slot.save();
  return slot;
};

// Static method to release held slot
TimeSlotSchema.statics.releaseSlot = async function(slotId) {
  const slot = await this.findById(slotId);
  
  if (!slot) {
    throw new Error('Slot not found');
  }
  
  if (slot.status === 'held') {
    slot.status = 'available';
    slot.heldBy = undefined;
    slot.heldAt = undefined;
    slot.holdExpiry = undefined;
    await slot.save();
  }
  
  return slot;
};

// Static method to release expired holds
TimeSlotSchema.statics.releaseExpiredHolds = async function() {
  const expiredSlots = await this.find({
    status: 'held',
    holdExpiry: { $lt: Date.now() }
  });
  
  for (const slot of expiredSlots) {
    slot.status = 'available';
    slot.heldBy = undefined;
    slot.heldAt = undefined;
    slot.holdExpiry = undefined;
    await slot.save();
  }
  
  return expiredSlots.length;
};

// Static method to confirm booking
TimeSlotSchema.statics.confirmBooking = async function(slotId, bookingId) {
  const slot = await this.findById(slotId);
  
  if (!slot) {
    throw new Error('Slot not found');
  }
  
  if (slot.status !== 'held' && slot.status !== 'available') {
    throw new Error('Slot cannot be booked');
  }
  
  slot.status = 'booked';
  slot.booking = bookingId;
  slot.heldBy = undefined;
  slot.heldAt = undefined;
  slot.holdExpiry = undefined;
  
  await slot.save();
  return slot;
};

// Static method to generate slots for a court on a specific date
TimeSlotSchema.statics.generateSlotsForDate = async function(courtId, date) {
  const Court = mongoose.model('Court');
  const court = await Court.findById(courtId).populate('venue');
  
  if (!court) {
    throw new Error('Court not found');
  }
  
  // Check if court is available on this date
  if (!court.isAvailableOnDate(date)) {
    return [];
  }
  
  const dateObj = new Date(date);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dateObj.getDay()];
  
  // Get venue operating hours for this day
  const operatingHours = court.venue.operatingHours[dayName];
  
  if (!operatingHours || operatingHours.closed) {
    return [];
  }
  
  const startHour = parseInt(operatingHours.open.split(':')[0]);
  const startMinute = parseInt(operatingHours.open.split(':')[1]);
  const endHour = parseInt(operatingHours.close.split(':')[0]);
  const endMinute = parseInt(operatingHours.close.split(':')[1]);
  
  const slotInterval = court.pricing.slotInterval || 60;
  const slots = [];
  
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Calculate end time
    let endTimeMinutes = currentMinute + slotInterval;
    let endTimeHour = currentHour;
    
    if (endTimeMinutes >= 60) {
      endTimeHour += Math.floor(endTimeMinutes / 60);
      endTimeMinutes = endTimeMinutes % 60;
    }
    
    const endTime = `${endTimeHour.toString().padStart(2, '0')}:${endTimeMinutes.toString().padStart(2, '0')}`;
    
    // Check if this slot already exists
    const existingSlot = await this.findOne({
      court: courtId,
      date: dateObj,
      startTime: startTime
    });
    
    if (!existingSlot) {
      // Get pricing for this slot
      const price = court.getPricing(date, startTime);
      
      const slot = await this.create({
        court: courtId,
        venue: court.venue._id,
        date: dateObj,
        startTime: startTime,
        endTime: endTime,
        duration: slotInterval,
        price: price,
        status: 'available'
      });
      
      slots.push(slot);
    }
    
    // Move to next slot
    currentMinute += slotInterval;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }
  
  return slots;
};

// Indexes for efficient querying
TimeSlotSchema.index({ court: 1, date: 1, startTime: 1 });
TimeSlotSchema.index({ venue: 1, date: 1, status: 1 });
TimeSlotSchema.index({ status: 1 });
TimeSlotSchema.index({ holdExpiry: 1 });

module.exports = mongoose.model('TimeSlot', TimeSlotSchema);
