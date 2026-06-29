const ArtistBooking = require('../models/ArtistBooking');
const TeachingBooking = require('../models/TeachingBooking');
const ArtistAvailability = require('../models/ArtistAvailability');

const ACTIVE_EVENT_STATUSES = ['pending', 'accepted', 'counter_offered', 'confirmed'];
const PENDING_PAYMENT_HOLD_MS = 30 * 60 * 1000;

const DAY_MAP = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function normalizeDateOnly(dateInput) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(dateInput) {
  const d = normalizeDateOnly(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function computeDayStatus(busySlots, availableSlotCount, hasExplicitUnavailable = false) {
  if (hasExplicitUnavailable) return 'unavailable';
  const hasFullDayBlock = busySlots.some(
    (slot) => slot.type === 'blocked' && slot.startTime <= '00:00' && slot.endTime >= '23:59'
  );
  if (hasFullDayBlock) return 'unavailable';
  if (availableSlotCount === 0 && busySlots.length > 0) return 'fully_booked';
  if (busySlots.length > 0 && availableSlotCount > 0) return 'partially_booked';
  if (busySlots.length > 0) return 'partially_booked';
  return 'available';
}

async function getActiveTeachingBookingsForDate(artistId, dateInput, options = {}) {
  const { excludeBookingId, excludeTeachingBookingId } = options;
  const excludeId = excludeTeachingBookingId || excludeBookingId;

  const dateOnly = normalizeDateOnly(dateInput);
  const nextDay = new Date(dateOnly);
  nextDay.setDate(nextDay.getDate() + 1);

  const teachingQuery = {
    artistId,
    bookingDate: { $gte: dateOnly, $lt: nextDay },
    $or: [
      { status: { $in: ['confirmed', 'completed'] } },
      {
        status: 'pending_payment',
        createdAt: { $gte: new Date(Date.now() - PENDING_PAYMENT_HOLD_MS) },
      },
    ],
  };
  if (excludeId) {
    teachingQuery._id = { $ne: excludeId };
  }

  return TeachingBooking.find(teachingQuery).select('startTime endTime studentName classId status');
}

function slotsTimeOverlap(startA, endA, startB, endB) {
  return timesOverlap(
    timeToMinutes(startA),
    timeToMinutes(endA),
    timeToMinutes(startB),
    timeToMinutes(endB)
  );
}

function countClassBookingsAtSlot(teachingBookings, classId, startTime, endTime) {
  const classIdStr = classId?.toString();
  return teachingBookings.filter(
    (booking) =>
      booking.classId?.toString() === classIdStr &&
      booking.startTime === startTime &&
      booking.endTime === endTime
  ).length;
}

function evaluateTeachingClassSlot(busySlots, teachingBookings, classId, startTime, endTime, maxStudents) {
  const capacity = Math.max(1, Number(maxStudents) || 1);

  const hasEventConflict = busySlots.some(
    (slot) => slot.type === 'event' && slotsTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)
  );
  if (hasEventConflict) {
    return { available: false, reason: 'Artist has an event at this time', spotsLeft: 0, bookedCount: 0, maxStudents: capacity };
  }

  const hasBlockConflict = busySlots.some(
    (slot) => slot.type === 'blocked' && slotsTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)
  );
  if (hasBlockConflict) {
    return { available: false, reason: 'Artist is not available at this time', spotsLeft: 0, bookedCount: 0, maxStudents: capacity };
  }

  const classIdStr = classId?.toString();
  const otherTeachingConflict = teachingBookings.some((booking) => {
    const sameClassExactSlot =
      booking.classId?.toString() === classIdStr &&
      booking.startTime === startTime &&
      booking.endTime === endTime;
    if (sameClassExactSlot) return false;
    return slotsTimeOverlap(startTime, endTime, booking.startTime, booking.endTime);
  });
  if (otherTeachingConflict) {
    return { available: false, reason: 'Artist is not available at this time', spotsLeft: 0, bookedCount: 0, maxStudents: capacity };
  }

  const bookedCount = countClassBookingsAtSlot(teachingBookings, classId, startTime, endTime);
  const spotsLeft = Math.max(0, capacity - bookedCount);

  if (bookedCount >= capacity) {
    return {
      available: false,
      reason: 'This session is fully booked',
      bookedCount,
      spotsLeft: 0,
      maxStudents: capacity,
    };
  }

  return { available: true, bookedCount, spotsLeft, maxStudents: capacity };
}

function assembleBusySlots(eventBookings, teachingBookings, availability) {
  const busySlots = [];

  eventBookings.forEach((booking) => {
    busySlots.push({
      startTime: booking.event.startTime,
      endTime: booking.event.endTime,
      type: 'event',
      label: booking.event.name || 'Event booking',
      status: booking.booking.status,
    });
  });

  teachingBookings.forEach((booking) => {
    busySlots.push({
      startTime: booking.startTime,
      endTime: booking.endTime,
      type: 'teaching',
      label: booking.studentName || 'Teaching session',
      status: booking.status,
      bookingId: booking._id,
    });
  });

  if (availability) {
    if (availability.dayStatus === 'unavailable') {
      busySlots.push({
        startTime: '00:00',
        endTime: '23:59',
        type: 'blocked',
        label: 'Artist unavailable',
      });
    } else {
      availability.timeSlots
        .filter((slot) => !slot.isAvailable && !slot.isBooked)
        .forEach((slot) => {
          busySlots.push({
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: 'blocked',
            label: slot.note || 'Blocked',
          });
        });
    }

    availability.timeSlots
      .filter((slot) => slot.isBooked)
      .forEach((slot) => {
        const duplicate = busySlots.some(
          (b) => b.startTime === slot.startTime && b.endTime === slot.endTime
        );
        if (!duplicate) {
          busySlots.push({
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.teachingBookingId ? 'teaching' : 'event',
            label: slot.note || 'Booked',
            bookingId: slot.teachingBookingId || slot.bookingId,
          });
        }
      });
  }

  return busySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

async function getDayScheduleSources(artistId, dateInput, options = {}) {
  const dateOnly = normalizeDateOnly(dateInput);
  const nextDay = new Date(dateOnly);
  nextDay.setDate(nextDay.getDate() + 1);

  const [eventBookings, teachingBookings, availability] = await Promise.all([
    ArtistBooking.find({
      artist: artistId,
      'event.date': { $gte: dateOnly, $lt: nextDay },
      'booking.status': { $in: ACTIVE_EVENT_STATUSES },
    }).select('event.startTime event.endTime event.name booking.status'),
    getActiveTeachingBookingsForDate(artistId, dateInput, options),
    ArtistAvailability.findOne({ artist: artistId, date: dateOnly }),
  ]);

  return { eventBookings, teachingBookings, availability };
}

async function getBusySlotsForDate(artistId, dateInput, options = {}) {
  const { eventBookings, teachingBookings, availability } = await getDayScheduleSources(
    artistId,
    dateInput,
    options
  );
  return assembleBusySlots(eventBookings, teachingBookings, availability);
}

function isSlotFree(busySlots, startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) return false;

  return !busySlots.some((slot) =>
    timesOverlap(start, end, timeToMinutes(slot.startTime), timeToMinutes(slot.endTime))
  );
}

function generateTeachingSlotsForClass(teachingClass, dateInput) {
  const date = normalizeDateOnly(dateInput);
  const dayIndex = date.getDay();
  const schedule = teachingClass.schedule || {};
  const durationMinutes = schedule.durationMinutes || 60;

  const windowStart = schedule.startTime || '09:00';
  const windowEnd = schedule.endTime || '20:00';

  if (schedule.days && schedule.days.length > 0) {
    const allowed = schedule.days.some((day) => DAY_MAP[day] === dayIndex);
    if (!allowed) return [];
  }

  const slots = [];
  let cursor = timeToMinutes(windowStart);
  const endLimit = timeToMinutes(windowEnd);

  while (cursor + durationMinutes <= endLimit) {
    const slotStart = minutesToTime(cursor);
    const slotEnd = minutesToTime(cursor + durationMinutes);
    slots.push({ startTime: slotStart, endTime: slotEnd, durationMinutes });
    cursor += durationMinutes;
  }

  return slots;
}

async function checkTeachingSlotAvailable(artistId, dateInput, startTime, endTime, options = {}) {
  const { classId, maxStudents } = options;

  if (classId) {
    const [busySlots, teachingBookings] = await Promise.all([
      getBusySlotsForDate(artistId, dateInput, options),
      getActiveTeachingBookingsForDate(artistId, dateInput, options),
    ]);
    const result = evaluateTeachingClassSlot(
      busySlots,
      teachingBookings,
      classId,
      startTime,
      endTime,
      maxStudents
    );
    return { ...result, busySlots };
  }

  const busySlots = await getBusySlotsForDate(artistId, dateInput, options);
  if (!isSlotFree(busySlots, startTime, endTime)) {
    return { available: false, reason: 'Artist is not available at this time', busySlots };
  }
  return { available: true, busySlots };
}

async function checkSlotAvailable(artistId, dateInput, startTime, endTime, options = {}) {
  return checkTeachingSlotAvailable(artistId, dateInput, startTime, endTime, options);
}

function buildUnifiedDayDataFromSources(dateInput, daySources, options = {}) {
  const { classForTeachingSlots, basePrice = 0 } = options;
  const { eventBookings, teachingBookings, availability } = daySources;
  const busySlots = assembleBusySlots(eventBookings, teachingBookings, availability);

  let availableSlots = [];
  let candidateCount = 0;
  const hasExplicitUnavailable = availability?.dayStatus === 'unavailable';

  if (classForTeachingSlots) {
    const capacity = Math.max(1, classForTeachingSlots.maxStudents || 1);
    const candidateSlots = generateTeachingSlotsForClass(classForTeachingSlots, dateInput);
    candidateCount = candidateSlots.length;
    availableSlots = candidateSlots
      .map((slot) => {
        const slotCheck = evaluateTeachingClassSlot(
          busySlots,
          teachingBookings,
          classForTeachingSlots._id,
          slot.startTime,
          slot.endTime,
          capacity
        );
        if (!slotCheck.available) return null;
        return {
          ...slot,
          price: classForTeachingSlots.pricing?.amount || 0,
          calculatedPrice: classForTeachingSlots.pricing?.amount || 0,
          maxStudents: capacity,
          bookedCount: slotCheck.bookedCount,
          spotsLeft: slotCheck.spotsLeft,
        };
      })
      .filter(Boolean);
  } else if (availability?.timeSlots?.length) {
    const openSlots = availability.timeSlots.filter((slot) => slot.isAvailable && !slot.isBooked);
    candidateCount = openSlots.length;
    availableSlots = openSlots
      .filter((slot) => isSlotFree(busySlots, slot.startTime, slot.endTime))
      .map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        calculatedPrice: availability.calculatePrice(slot.startTime, slot.endTime, basePrice),
        price: slot.price || basePrice,
        note: slot.note,
      }));
  }

  let dayStatus;
  if (!classForTeachingSlots && !availability?.timeSlots?.length) {
    const hasFullDayBlock = busySlots.some(
      (slot) => slot.type === 'blocked' && slot.startTime <= '00:00' && slot.endTime >= '23:59'
    );
    const bookingCount = busySlots.filter((slot) => slot.type === 'event' || slot.type === 'teaching').length;

    if (hasExplicitUnavailable || hasFullDayBlock) {
      dayStatus = 'unavailable';
    } else if (bookingCount > 0) {
      dayStatus = 'partially_booked';
    } else {
      dayStatus = 'available';
    }
  } else {
    dayStatus = computeDayStatus(
      busySlots,
      availableSlots.length,
      hasExplicitUnavailable
    );
  }

  return {
    dayStatus,
    busySlots,
    bookedSlots: busySlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      label: slot.label,
      status: slot.status,
    })),
    availableSlots,
    totalSlots: candidateCount,
    isSpecialDay: availability?.specialPricing?.isSpecialDay || false,
    specialReason: availability?.specialPricing?.reason,
    minimumBookingDuration: availability?.minimumBookingDuration,
    maximumBookingDuration: availability?.maximumBookingDuration,
    advanceBookingDays: availability?.advanceBookingDays,
  };
}

async function buildUnifiedDayData(artistId, dateInput, options = {}) {
  const daySources = await getDayScheduleSources(artistId, dateInput, options);
  return buildUnifiedDayDataFromSources(dateInput, daySources, options);
}

async function getMonthScheduleSources(artistId, month, year, options = {}) {
  const { excludeBookingId, excludeTeachingBookingId } = options;
  const excludeId = excludeTeachingBookingId || excludeBookingId;

  const startDate = normalizeDateOnly(new Date(year, month - 1, 1));
  const endDate = new Date(year, month, 0);
  const endDateExclusive = new Date(endDate);
  endDateExclusive.setDate(endDateExclusive.getDate() + 1);

  const teachingQuery = {
    artistId,
    bookingDate: { $gte: startDate, $lt: endDateExclusive },
    $or: [
      { status: { $in: ['confirmed', 'completed'] } },
      {
        status: 'pending_payment',
        createdAt: { $gte: new Date(Date.now() - PENDING_PAYMENT_HOLD_MS) },
      },
    ],
  };
  if (excludeId) {
    teachingQuery._id = { $ne: excludeId };
  }

  const [eventBookings, teachingBookings, availabilityRecords] = await Promise.all([
    ArtistBooking.find({
      artist: artistId,
      'event.date': { $gte: startDate, $lt: endDateExclusive },
      'booking.status': { $in: ACTIVE_EVENT_STATUSES },
    }).select('event.startTime event.endTime event.name event.date booking.status'),
    TeachingBooking.find(teachingQuery).select('startTime endTime studentName classId status bookingDate'),
    ArtistAvailability.find({
      artist: artistId,
      date: { $gte: startDate, $lte: endDate },
    }),
  ]);

  const eventsByDate = {};
  eventBookings.forEach((booking) => {
    const dateKey = toDateKey(booking.event.date);
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(booking);
  });

  const teachingByDate = {};
  teachingBookings.forEach((booking) => {
    const dateKey = toDateKey(booking.bookingDate);
    if (!teachingByDate[dateKey]) teachingByDate[dateKey] = [];
    teachingByDate[dateKey].push(booking);
  });

  const availabilityByDate = {};
  availabilityRecords.forEach((record) => {
    availabilityByDate[toDateKey(record.date)] = record;
  });

  return { eventsByDate, teachingByDate, availabilityByDate, startDate, endDate };
}

async function getUnifiedMonthCalendar(artistId, month, year, options = {}) {
  const { eventsByDate, teachingByDate, availabilityByDate, startDate, endDate } =
    await getMonthScheduleSources(artistId, month, year, options);

  const calendarData = {};
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = toDateKey(cursor);
    calendarData[dateKey] = buildUnifiedDayDataFromSources(
      cursor,
      {
        eventBookings: eventsByDate[dateKey] || [],
        teachingBookings: teachingByDate[dateKey] || [],
        availability: availabilityByDate[dateKey] || null,
      },
      options
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return calendarData;
}

async function markTeachingSlotBooked(artistId, dateInput, startTime, endTime, teachingBookingId, classId, maxStudents) {
  const capacity = Math.max(1, Number(maxStudents) || 1);
  const teachingBookings = await getActiveTeachingBookingsForDate(artistId, dateInput);
  const bookedCount = countClassBookingsAtSlot(teachingBookings, classId, startTime, endTime);

  if (bookedCount < capacity) {
    return null;
  }

  const dateOnly = normalizeDateOnly(dateInput);

  let availability = await ArtistAvailability.findOne({
    artist: artistId,
    date: dateOnly,
  });

  const bookedSlot = {
    startTime,
    endTime,
    isAvailable: true,
    isBooked: true,
    teachingBookingId,
    note: 'Teaching session',
  };

  const buildSplitSlots = () => {
    const slots = [];
    if (startTime !== '00:00') {
      slots.push({ startTime: '00:00', endTime: startTime, isAvailable: true, isBooked: false });
    }
    slots.push(bookedSlot);
    if (endTime !== '23:59') {
      slots.push({ startTime: endTime, endTime: '23:59', isAvailable: true, isBooked: false });
    }
    return slots;
  };

  if (!availability) {
    availability = new ArtistAvailability({
      artist: artistId,
      date: dateOnly,
      timeSlots: buildSplitSlots(),
    });
    availability.updateDayStatus();
    await availability.save();
    return availability;
  }

  if (Array.isArray(availability.timeSlots) && availability.timeSlots.length > 0) {
    const existing = availability.timeSlots.find(
      (slot) => slot.startTime === startTime && slot.endTime === endTime && slot.isBooked
    );
    if (!existing) {
      const slotIndex = availability.timeSlots.findIndex(
        (slot) =>
          slot.startTime <= startTime &&
          slot.endTime >= endTime &&
          slot.isAvailable &&
          !slot.isBooked
      );
      if (slotIndex >= 0) {
        availability.timeSlots[slotIndex].isBooked = true;
        availability.timeSlots[slotIndex].teachingBookingId = teachingBookingId;
        availability.timeSlots[slotIndex].note = 'Teaching session';
      } else {
        availability.timeSlots.push(bookedSlot);
        availability.timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    }
  } else {
    availability.timeSlots = buildSplitSlots();
  }

  availability.updateDayStatus();
  await availability.save();
  return availability;
}

async function getMonthlySchedule(artistId, month, year, classId) {
  const TeachingClass = require('../models/TeachingClass');

  const teachingClass = await TeachingClass.findOne({
    _id: classId,
    artistId,
    isActive: true,
  });

  if (!teachingClass) {
    return { error: 'Class not found' };
  }

  const calendarData = await getUnifiedMonthCalendar(artistId, month, year, {
    classForTeachingSlots: teachingClass,
  });

  return { teachingClass, calendarData };
}

async function getEventBookingsByDate(artistId, startDate, endDate) {
  const bookings = await ArtistBooking.find({
    artist: artistId,
    'event.date': { $gte: startDate, $lte: endDate },
    'booking.status': { $in: ACTIVE_EVENT_STATUSES },
  })
    .select('event booking.status')
    .sort({ 'event.date': 1, 'event.startTime': 1 });

  return bookings.reduce((acc, booking) => {
    const dateKey = toDateKey(booking.event.date);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push({
      _id: booking._id,
      startTime: booking.event.startTime,
      endTime: booking.event.endTime,
      eventName: booking.event.name,
      status: booking.booking.status,
      type: 'event',
    });
    return acc;
  }, {});
}

async function getTeachingBookingsByDate(artistId, startDate, endDate) {
  const bookings = await TeachingBooking.find({
    artistId,
    bookingDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['confirmed', 'completed'] },
  })
    .populate('classId', 'title mode')
    .sort({ bookingDate: 1, startTime: 1 });

  return bookings.reduce((acc, booking) => {
    const dateKey = toDateKey(booking.bookingDate);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push({
      _id: booking._id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      studentName: booking.studentName,
      mode: booking.mode,
      status: booking.status,
      classTitle: booking.classId?.title,
      amount: booking.pricing?.amount,
      type: 'teaching',
    });
    return acc;
  }, {});
}

module.exports = {
  ACTIVE_EVENT_STATUSES,
  PENDING_PAYMENT_HOLD_MS,
  timeToMinutes,
  timesOverlap,
  toDateKey,
  normalizeDateOnly,
  getActiveTeachingBookingsForDate,
  countClassBookingsAtSlot,
  evaluateTeachingClassSlot,
  getBusySlotsForDate,
  isSlotFree,
  generateTeachingSlotsForClass,
  checkTeachingSlotAvailable,
  checkSlotAvailable,
  buildUnifiedDayData,
  getUnifiedMonthCalendar,
  markTeachingSlotBooked,
  getMonthlySchedule,
  getEventBookingsByDate,
  getTeachingBookingsByDate,
  computeDayStatus,
};
