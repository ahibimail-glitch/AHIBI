const RSVP_STATUSES = ['pending', 'contacted', 'booked', 'declined'];
const RSVP_UPDATE_STATUSES = ['contacted', 'booked', 'declined'];

class DailyEventRsvpValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DailyEventRsvpValidationError';
    this.statusCode = 400;
  }
}

function isRsvpBookingType(bookingType) {
  return bookingType === 'rsvp' || bookingType === 'call_to_book';
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseRsvpSubmission(body, activeDates) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new DailyEventRsvpValidationError('Enter your contact details to request an RSVP.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const requestedDate = typeof body.requestedDate === 'string' ? body.requestedDate.trim() : '';
  const partySize = Number(body.partySize);

  if (name.length < 2 || name.length > 120) {
    throw new DailyEventRsvpValidationError('Enter a name between 2 and 120 characters.');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DailyEventRsvpValidationError('Enter a valid email address.');
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new DailyEventRsvpValidationError('Enter a valid phone number.');
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 100) {
    throw new DailyEventRsvpValidationError('Choose a number of people from 1 to 100.');
  }
  if (address.length < 3 || address.length > 250) {
    throw new DailyEventRsvpValidationError('Enter an address between 3 and 250 characters.');
  }

  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? new Date(`${requestedDate}T00:00:00.000Z`)
    : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || dateKey(parsedDate) !== requestedDate) {
    throw new DailyEventRsvpValidationError('Choose a valid event date.');
  }

  const activeDateKeys = Array.isArray(activeDates) ? activeDates.map(dateKey).filter(Boolean) : [];
  if (!activeDateKeys.includes(requestedDate)) {
    throw new DailyEventRsvpValidationError('That date is not available for this event.');
  }

  return {
    name,
    email,
    phone,
    partySize,
    address,
    requestedDate,
  };
}

function canUpdateRsvpStatus(currentStatus, nextStatus) {
  if (!RSVP_STATUSES.includes(currentStatus) || !RSVP_UPDATE_STATUSES.includes(nextStatus)) return false;
  if (currentStatus === nextStatus) return true;
  return currentStatus === 'pending' || currentStatus === 'contacted';
}

module.exports = {
  DailyEventRsvpValidationError,
  RSVP_STATUSES,
  RSVP_UPDATE_STATUSES,
  canUpdateRsvpStatus,
  isRsvpBookingType,
  parseRsvpSubmission,
};
