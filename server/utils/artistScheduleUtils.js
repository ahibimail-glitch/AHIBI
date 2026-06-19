const ArtistBooking = require('../models/ArtistBooking');
const TeachingBooking = require('../models/TeachingBooking');
const ArtistAvailability = require('../models/ArtistAvailability');

const ACTIVE_EVENT_STATUSES = ['pending', 'accepted', 'counter_offered', 'confirmed'];
const ACTIVE_TEACHING_STATUSES = ['pending_payment', 'confirmed'];

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

function toDateKey(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateOnly(dateInput) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getBusySlotsForDate(artistId, dateInput) {
  const dateOnly = normalizeDateOnly(dateInput);
  const nextDay = new Date(dateOnly);
  nextDay.setDate(nextDay.getDate() + 1);

  const [eventBookings, teachingBookings, availability] = await Promise.all([
    ArtistBooking.find({
      artist: artistId,
      'event.date': { $gte: dateOnly, $lt: nextDay },
      'booking.status': { $in: ACTIVE_EVENT_STATUSES },
    }).select('event.startTime event.endTime event.name booking.status'),
    TeachingBooking.find({
      artistId,
      bookingDate: { $gte: dateOnly, $lt: nextDay },
      status: { $in: ACTIVE_TEACHING_STATUSES },
      $or: [
        { status: 'confirmed' },
        {
          status: 'pending_payment',
          createdAt: { $gte: new Date(Date.now() - 20 * 60 * 1000) },
        },
      ],
    }).select('startTime endTime studentName classId status'),
    ArtistAvailability.findOne({ artist: artistId, date: dateOnly }),
  ]);

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
        if (!busySlots.some((b) => b.startTime === slot.startTime && b.endTime === slot.endTime)) {
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

  let windowStart = schedule.startTime || '09:00';
  let windowEnd = schedule.endTime || '20:00';

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

async function checkTeachingSlotAvailable(artistId, dateInput, startTime, endTime) {
  const busySlots = await getBusySlotsForDate(artistId, dateInput);
  if (!isSlotFree(busySlots, startTime, endTime)) {
    return { available: false, reason: 'Artist is not available at this time', busySlots };
  }
  return { available: true, busySlots };
}

async function markTeachingSlotBooked(artistId, dateInput, startTime, endTime, teachingBookingId) {
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
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const TeachingClass = require('../models/TeachingClass');

  const teachingClass = await TeachingClass.findOne({
    _id: classId,
    artistId,
    isActive: true,
  });

  if (!teachingClass) {
    return { error: 'Class not found' };
  }

  const calendarData = {};
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = toDateKey(cursor);
    const busySlots = await getBusySlotsForDate(artistId, cursor);
    const candidateSlots = generateTeachingSlotsForClass(teachingClass, cursor);
    const availableSlots = candidateSlots.filter((slot) =>
      isSlotFree(busySlots, slot.startTime, slot.endTime)
    );

    let dayStatus = 'available';
    if (candidateSlots.length === 0) {
      dayStatus = busySlots.length > 0 ? 'partially_booked' : 'unavailable';
    } else if (availableSlots.length === 0) {
      dayStatus = 'fully_booked';
    } else if (availableSlots.length < candidateSlots.length) {
      dayStatus = 'partially_booked';
    }

    calendarData[dateKey] = {
      dayStatus,
      availableSlots: availableSlots.map((slot) => ({
        ...slot,
        price: teachingClass.pricing?.amount || 0,
      })),
      bookedSlots: busySlots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type,
        label: slot.label,
      })),
      totalSlots: candidateSlots.length,
    };

    cursor.setDate(cursor.getDate() + 1);
  }

  return { teachingClass, calendarData };
}

module.exports = {
  ACTIVE_EVENT_STATUSES,
  ACTIVE_TEACHING_STATUSES,
  timeToMinutes,
  timesOverlap,
  toDateKey,
  normalizeDateOnly,
  getBusySlotsForDate,
  isSlotFree,
  generateTeachingSlotsForClass,
  checkTeachingSlotAvailable,
  markTeachingSlotBooked,
  getMonthlySchedule,
};
