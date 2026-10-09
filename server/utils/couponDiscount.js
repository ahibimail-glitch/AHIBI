function isGeneralAdmissionTicketType(name) {
  const normalized = String(name || '').trim().toLowerCase();
  return normalized === 'general admission' || normalized.includes('general admission');
}

function validateGroup10Tickets(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return { valid: false, message: 'No tickets selected' };
  }

  const allGeneralAdmission = tickets.every((t) =>
    isGeneralAdmissionTicketType(t.ticketType)
  );
  if (!allGeneralAdmission) {
    return {
      valid: false,
      message: 'This coupon is only valid for General Admission tickets',
    };
  }

  const totalQuantity = tickets.reduce(
    (sum, t) => sum + (Number(t.quantity) || 0),
    0
  );
  if (totalQuantity < 4) {
    return {
      valid: false,
      message: 'Please select 4 or more tickets to apply this coupon',
    };
  }

  return { valid: true };
}

function computeTicketsSubtotal(tickets) {
  return (tickets || []).reduce(
    (sum, t) => sum + (Number(t.price) || 0) * (Number(t.quantity) || 0),
    0
  );
}

const CHEESE_GROUP_COUPON_CODES = new Set(['GROUP10']);

function validateCheeseGroupCoupon(tickets, minQuantity = 4) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return { valid: false, message: 'No tickets selected' };
  }

  const totalQuantity = tickets.reduce(
    (sum, t) => sum + (Number(t.quantity) || 0),
    0
  );

  if (totalQuantity < minQuantity) {
    return {
      valid: false,
      message: 'Please select 4 or more tickets to apply this coupon',
    };
  }

  return { valid: true, applicableQuantity: totalQuantity };
}

/**
 * Compute discount for a coupon and ticket selection.
 * GROUP10: 10% (or configured %) off entire subtotal when 4+ General Admission tickets.
 * Cheese event group coupons: 10% off entire subtotal when 4+ tickets total (mixed categories allowed).
 * Other coupons: percentage/fixed off matching ticketCategory only.
 */
function computeCouponDiscount(coupon, tickets) {
  const totalAmount = computeTicketsSubtotal(tickets);
  const code = String(coupon.code || '').trim().toUpperCase();

  if (CHEESE_GROUP_COUPON_CODES.has(code)) {
    const groupValidation = validateCheeseGroupCoupon(tickets);
    if (!groupValidation.valid) {
      return { error: groupValidation.message };
    }

    const discountPercentage =
      coupon.discountPercentage !== undefined && coupon.discountPercentage !== null
        ? coupon.discountPercentage
        : 10;
    const discountAmount = Math.round((totalAmount * discountPercentage) / 100);

    return {
      discountAmount,
      totalAmount,
      ticketCategory: coupon.ticketCategory,
      applicableQuantity: groupValidation.applicableQuantity,
    };
  }

  if (code === 'GROUP10') {
    const groupValidation = validateGroup10Tickets(tickets);
    if (!groupValidation.valid) {
      return { error: groupValidation.message };
    }

    let discountAmount = 0;
    if (coupon.discountPercentage !== undefined && coupon.discountPercentage !== null) {
      discountAmount = Math.round((totalAmount * coupon.discountPercentage) / 100);
    } else if (coupon.discountPrice !== undefined && coupon.discountPrice !== null) {
      discountAmount = Math.min(Number(coupon.discountPrice), totalAmount);
    }

    return {
      discountAmount,
      totalAmount,
      ticketCategory: 'General Admission',
      applicableQuantity: tickets.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0),
    };
  }

  const applicableCategory = coupon.ticketCategory;
  const applicableTickets = (tickets || []).filter(
    (t) => t.ticketType === applicableCategory
  );
  if (applicableTickets.length === 0) {
    return {
      error: `Coupon applies to ${applicableCategory} tickets only`,
    };
  }

  const totalApplicableQuantity = applicableTickets.reduce(
    (sum, t) => sum + (Number(t.quantity) || 0),
    0
  );
  const unitPrice = Number(applicableTickets[0]?.price) || 0;
  let discountAmount = 0;

  if (coupon.discountPercentage !== undefined && coupon.discountPercentage !== null) {
    discountAmount = Math.round(
      (unitPrice * totalApplicableQuantity * coupon.discountPercentage) / 100
    );
  } else if (coupon.discountPrice !== undefined && coupon.discountPrice !== null) {
    discountAmount = Math.min(
      coupon.discountPrice * totalApplicableQuantity,
      unitPrice * totalApplicableQuantity
    );
  }

  return {
    discountAmount,
    totalAmount,
    ticketCategory: applicableCategory,
    applicableQuantity: totalApplicableQuantity,
  };
}

module.exports = {
  isGeneralAdmissionTicketType,
  validateGroup10Tickets,
  validateCheeseGroupCoupon,
  computeTicketsSubtotal,
  computeCouponDiscount,
};
