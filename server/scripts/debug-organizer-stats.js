const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const Event = require('../models/Event');
const DailyEvent = require('../models/DailyEvent');
const Booking = require('../models/Booking');
const Organizer = require('../models/Organizer');
const User = require('../models/User');

const oid = '690c41d0bd29716fe8b8a4fb';

async function main() {
  mongoose.set('strictQuery', false);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 60000 });

  const org = await Organizer.findById(oid).lean();
  const user = await User.findOne({ email: org?.email }).lean();

  const scopes = [
    { label: 'organizer field', q: { organizer: oid } },
    { label: 'createdBy field', q: { createdBy: oid } },
    { label: 'organizerInfo.id', q: { 'organizerInfo.id': oid } },
    { label: 'organizerInfo.email', q: { 'organizerInfo.email': org?.email } },
    { label: 'organizerInfo.name akok', q: { 'organizerInfo.name': org?.name } },
    { label: 'organizerInfo.name kaki', q: { 'organizerInfo.name': org?.companyName } },
  ];

  if (user?._id) {
    scopes.push(
      { label: 'organizer=User._id', q: { organizer: user._id } },
      { label: 'createdBy=User._id', q: { createdBy: user._id } }
    );
  }

  console.log('\n=== Organizer ===');
  console.log({
    statistics: org?.statistics,
    totalPaidOut: org?.totalPaidOut,
    pendingPayouts: org?.pendingPayouts,
    payoutHistoryLen: org?.payoutHistory?.length ?? 0,
  });
  console.log('Linked User:', user ? { id: user._id, email: user.email } : 'none');

  for (const { label, q } of scopes) {
    const eventCount = await Event.countDocuments(q);
    const dailyCount = await DailyEvent.countDocuments(q);
    if (eventCount === 0 && dailyCount === 0) continue;

    const events = await Event.find(q).select('title totalRevenue ticketsSold organizer createdBy').lean();
    const eventIds = events.map((e) => e._id);
    const daily = await DailyEvent.find(q).select('title totalRevenue ticketsSold').lean();
    const dailyIds = daily.map((d) => d._id);

    const bookingMatch = {
      paymentStatus: 'completed',
      $or: [
        ...(eventIds.length ? [{ event: { $in: eventIds } }] : []),
        ...(dailyIds.length ? [{ dailyEvent: { $in: dailyIds }, isDailyEvent: true }] : []),
      ],
    };

    let bookingSum = { totalRevenue: 0, totalTicketsSold: 0, count: 0 };
    if (bookingMatch.$or.length) {
      const [row] = await Booking.aggregate([
        { $match: bookingMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalTicketsSold: { $sum: '$quantity' },
            count: { $sum: 1 },
          },
        },
      ]);
      bookingSum = row || bookingSum;
    }

    const eventRev = events.reduce((s, e) => s + (e.totalRevenue || 0), 0);
    const eventTix = events.reduce((s, e) => s + (e.ticketsSold || 0), 0);

    console.log(`\n--- ${label} ---`);
    console.log({ events: eventCount, dailyEvents: dailyCount, eventRev, eventTix, bookingSum });
    events.forEach((e) =>
      console.log(`  Event: ${e.title?.slice(0, 40)} | rev=${e.totalRevenue} | tix=${e.ticketsSold}`)
    );
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
