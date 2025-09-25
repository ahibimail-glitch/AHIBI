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
    const { eventId, ticketCategory, discountPercentage, expiresAt } = req.body;

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
    for (let attempts = 0; attempts < 5; attempts++) {
      code = generateUniqueCode();
      const exists = await Coupon.findOne({ code });
      if (!exists) break;
      code = undefined;
    }
    if (!code) {
      return res.status(500).json({ message: 'Failed to generate unique coupon code' });
    }

    const coupon = await Coupon.create({
      code,
      event: { id: event._id, name: event.title },
      ticketCategory,
      discountPercentage,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
};

exports.getCoupons = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    next(err);
  }
};

exports.markUsed = async (req, res, next) => {
  try {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ code });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    if (coupon.status === 'used') return res.status(400).json({ message: 'Coupon already used' });
    coupon.status = 'used';
    coupon.usedAt = new Date();
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    next(err);
  }
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

    if (coupon.status === 'used') {
      return res.status(400).json({ message: 'Coupon already used' });
    }

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


