const Coupon = require('../models/Coupon');
const Event = require('../models/Event');

function generateUniqueCode() {
  const segments = [];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

exports.createCoupon = async (req, res, next) => {
  try {
    const { eventId, ticketCategory, discountPercentage, expiresAt, generatedBy, code: manualCode } = req.body;

    if (!eventId || !ticketCategory || discountPercentage === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const event = await Event.findById(eventId).select('title');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate ticket category exists in event.ticketTypes
    const categoryExists = (event.ticketTypes || []).some(t => t.name === ticketCategory);
    // If Event model in memory doesn't include ticketTypes due to select, refetch minimal
    if (!categoryExists) {
      const fullEvent = await Event.findById(eventId).select('title ticketTypes');
      if (!fullEvent) return res.status(404).json({ message: 'Event not found' });
      if (!fullEvent.ticketTypes.some(t => t.name === ticketCategory)) {
        return res.status(400).json({ message: 'Invalid ticket category for event' });
      }
    }

    let code;
    if (manualCode) {
      const normalized = String(manualCode).trim().toUpperCase();
      if (!/^[A-Z0-9\-]{4,36}$/.test(normalized)) {
        return res.status(400).json({ message: 'Invalid code format' });
      }
      const exists = await Coupon.findOne({ code: normalized });
      if (exists) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
      code = normalized;
    } else {
      for (let attempts = 0; attempts < 5; attempts++) {
        code = generateUniqueCode();
        const exists = await Coupon.findOne({ code });
        if (!exists) break;
        code = undefined;
      }
      if (!code) {
        return res.status(500).json({ message: 'Failed to generate unique coupon code' });
      }
    }

    const coupon = await Coupon.create({
      code,
      event: { id: event._id, name: event.title },
      ticketCategory,
      discountPercentage,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      generatedBy: generatedBy ? {
        id: generatedBy.id || undefined,
        name: generatedBy.name || undefined,
        email: generatedBy.email || undefined,
      } : undefined,
    });

    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
};

exports.getCoupons = async (req, res, next) => {
  try {
    const { status, code, eventName, eventId, ticketCategory, generatedBy, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (code) filter.code = { $regex: String(code).trim(), $options: 'i' };
    if (eventId) filter['event.id'] = eventId;
    if (eventName) filter['event.name'] = { $regex: String(eventName).trim(), $options: 'i' };
    if (ticketCategory) filter.ticketCategory = { $regex: String(ticketCategory).trim(), $options: 'i' };
    if (generatedBy) {
      filter.$or = [
        { 'generatedBy.name': { $regex: String(generatedBy).trim(), $options: 'i' } },
        { 'generatedBy.email': { $regex: String(generatedBy).trim(), $options: 'i' } }
      ];
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    next(err);
  }
};

exports.markUsed = async (req, res, next) => {
  // This feature is disabled to allow multiple uses of a coupon.
  return res.status(403).json({ message: 'This feature is disabled.' });
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};


// Validate a coupon for an event and selected tickets
// Expects: { code, eventId, tickets: [{ ticketType, quantity, price }] }
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, eventId, tickets } = req.body || {};
    if (!code || !eventId || !Array.isArray(tickets)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    if (String(coupon.event?.id) !== String(eventId)) {
      return res.status(400).json({ message: 'Coupon not valid for this event' });
    }

    // if (coupon.status === 'used') {
    //   return res.status(400).json({ message: 'Coupon already used' });
    // }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    // Check if selected tickets contain the applicable category
    const applicableCategory = coupon.ticketCategory;
    const applicableTickets = tickets.filter(t => t.ticketType === applicableCategory);
    if (applicableTickets.length === 0) {
      return res.status(400).json({ message: `Coupon applies to ${applicableCategory} tickets only` });
    }

    // Compute discount: apply ONCE per applicable ticket category (single unit price)
    const singleTicket = applicableTickets[0];
    const unitPrice = Number(singleTicket?.price) || 0;
    const discountAmount = Math.round((unitPrice * coupon.discountPercentage) / 100);
    const totalAmount = tickets.reduce((sum, t) => sum + (Number(t.price) || 0) * (Number(t.quantity) || 0), 0);
    const payable = Math.max(0, totalAmount - discountAmount);

    // NOTE: timesUsed will be incremented when the booking is actually completed
    // Do not increment here as this is just validation

    return res.json({
      valid: true,
      code: coupon.code,
      ticketCategory: applicableCategory,
      discountPercentage: coupon.discountPercentage,
      discountAmount,
      totalAmount,
      payable,
      message: 'Coupon applied'
    });
  } catch (err) {
    next(err);
  }
};


// Validate a coupon for Melita purchases (product-based, not event-based)
// Expects: { code, amount, melitaAmount, selectedTickets }
// Rules: 
// - If coupon event ID is 68c2c33eb6ef88c76f50ce7c (AHIBI FEST), apply 50% discount on Melita product and coupon percentage on tickets
// - Validates that coupon ticket category matches selected ticket types
// - Otherwise, event.name must be 'melita' (case-insensitive). Apply coupon percentage to amount.
exports.validateMelitaCoupon = async (req, res, next) => {
  try {
    const { code, amount, melitaAmount, selectedTickets } = req.body || {};
    if (!code || amount === undefined || amount === null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    // Check if coupon is for AHIBI FEST event (special case)
    const AHIBI_FEST_EVENT_ID = '68c2c33eb6ef88c76f50ce7c';
    const isAhibiFestCoupon = String(coupon.event?.id) === AHIBI_FEST_EVENT_ID;

    if (isAhibiFestCoupon) {
      // Special logic for AHIBI FEST coupons
      // Apply 50% discount on Melita product and coupon percentage on AHIBI tickets
      
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ message: 'Coupon has expired' });
      }

      // Validate ticket category matches selected tickets
      if (selectedTickets && Array.isArray(selectedTickets) && selectedTickets.length > 0) {
        const couponTicketCategory = coupon.ticketCategory;
        const hasMatchingTicket = selectedTickets.some(ticket => ticket.ticketType === couponTicketCategory);
        
        if (!hasMatchingTicket) {
          return res.status(400).json({ 
            message: `This coupon is only valid for ${couponTicketCategory} tickets. Please select ${couponTicketCategory} tickets to use this coupon.` 
          });
        }
      }

      const baseAmount = Number(amount) || 0; // AHIBI tickets amount
      const melitaProductAmount = Number(melitaAmount) || 0; // Melita product amount
      
      // Apply 50% discount on Melita product
      const melitaDiscountAmount = Math.round((melitaProductAmount * 50) / 100);
      
      // Apply coupon percentage on AHIBI tickets
      const ticketDiscountAmount = Math.round((baseAmount * coupon.discountPercentage) / 100);
      
      // Total discount is sum of both discounts
      const totalDiscountAmount = melitaDiscountAmount + ticketDiscountAmount;
      const totalAmount = melitaProductAmount + baseAmount;
      const payable = Math.max(0, totalAmount - totalDiscountAmount);

      return res.json({
        valid: true,
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        discountAmount: totalDiscountAmount,
        melitaDiscountAmount,
        ticketDiscountAmount,
        totalAmount,
        payable,
        isAhibiFestCoupon: true,
        message: `Coupon applied: 50% off Melita + ${coupon.discountPercentage}% off AHIBI tickets`
      });
    } else {
      // Original logic for regular Melita coupons
      // Enforce event.name === 'melita'
      const eventName = (coupon.event?.name || '').toLowerCase();
      if (eventName !== 'melita') {
        return res.status(400).json({ message: 'Coupon not valid for Melita' });
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ message: 'Coupon has expired' });
      }

      const baseAmount = Number(amount) || 0;
      const discountAmount = Math.round((baseAmount * coupon.discountPercentage) / 100);
      const payable = Math.max(0, baseAmount - discountAmount);

      return res.json({
        valid: true,
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        discountAmount,
        totalAmount: baseAmount,
        payable,
        isAhibiFestCoupon: false,
        message: 'Coupon applied'
      });
    }

    // NOTE: timesUsed will be incremented when the booking is actually completed
    // Do not increment here as this is just validation

  } catch (err) {
    next(err);
  }
};

