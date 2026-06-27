const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require('./routes/adminAuth.routes');
const artistRoutes = require('./routes/artist.routes');
const venueRoutes = require('./routes/venue.routes');
const organizerRoutes = require('./routes/organizer.routes');
const eventTeamRoutes = require('./routes/eventTeam.routes');
const eventRoutes = require('./routes/event.routes');
const dailyEventRoutes = require('./routes/dailyEvent.routes');

const uploadRoutes = require('./routes/upload.routes');
// const ticketRoutes = require('./routes/ticket.routes');
// const userRoutes = require('./routes/user.routes');
// const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const bookingRoutes = require('./routes/booking.routes');
const spaceBookingRoutes = require('./routes/spaceBooking.routes');
const { userRouter: supportRoutes, adminRouter: adminSupportRoutes } = require('./routes/support.routes');
const { userRouter: supportChatRoutes, adminRouter: adminSupportChatRoutes } = require('./routes/supportChat.routes');
const qrRoutes = require('./routes/qr.routes');
const paymentRoutes = require('./routes/payment.routes');
const merchRoutes = require('./routes/merch.routes');
const heroImageRoutes = require('./routes/heroImageRoutes');
const annieMusicalRoutes = require('./routes/annieMusicalRoutes');
const nisRegistrationRoutes = require('./routes/nisRegistration.routes');
const bikerBashRoutes = require('./routes/bikerBash.routes');
const couponRoutes = require('./routes/coupon.routes');
const aikoHallRoutes = require('./routes/aikoHall.routes');
const melitaRoutes = require('./routes/melitaRoutes');
const heliTaxiiRoutes = require('./routes/heliTaxii.routes');
const arenaPartnerRoutes = require('./routes/arenaPartner.routes');
const sportsRoutes = require('./routes/sports.routes');
const sportsAdminRoutes = require('./routes/sportsAdmin.routes');
const venueAdminRoutes = require('./routes/venueAdmin.routes');
const systemConfigRoutes = require('./routes/systemConfig.routes');
const danceLeagueRoutes = require('./routes/danceLeague.routes');
const livestreamRoutes = require('./routes/livestream.routes');
const livestreamPaymentRoutes = require('./routes/livestreamPayment.routes');
const livestreamChatRoutes = require('./routes/livestreamChat.routes');
const donationRoutes = require('./routes/donation.routes');
const adminNotificationRoutes = require('./routes/adminNotification.routes');
const adminTermsRoutes = require('./routes/adminTermsRoutes');
const publicTermsRoutes = require('./routes/publicTermsRoutes');
const futsalTournamentRoutes = require('./routes/futsalTournament.routes');

const User = require('./models/User');

// Create Express app
const app = express();
const server = http.createServer(app);
const paymentController = require('./controllers/paymentController');

// Set up CORS with credentials support
const allowedOrigins = [

  'https://ahibi.in',
  'http://ahibi.in',
  'http://localhost:3000',
  'https://ahibi.vercel.app'
];

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Set up livestream chat socket
const setupLivestreamChat = require('./socket/livestreamChat');
setupLivestreamChat(io);

// Set up middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Mount Razorpay webhooks BEFORE json parser to preserve raw body for signature verification
app.post('/api/payments/webhook/razorpay', express.raw({ type: '*/*' }), (req, res, next) => {
  // Store the raw body for the webhook controller
  req.rawBody = req.body;
  next();
}, (req, res) => {
  // Import the controller dynamically to avoid circular dependencies
  const paymentController = require('./controllers/paymentController');
  paymentController.razorpayWebhook(req, res);
});

app.post('/api/merch/payments/webhook/razorpay', express.raw({ type: '*/*' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
}, (req, res) => {
  const merchController = require('./controllers/merchController');
  merchController.razorpayWebhook(req, res);
});

app.post('/api/dance-league/webhook', express.raw({ type: '*/*' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
}, (req, res) => {
  const danceLeagueController = require('./controllers/danceLeagueController');
  danceLeagueController.handleWebhook(req, res);
});

app.post('/api/donations/webhook', express.raw({ type: '*/*' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
}, (req, res) => {
  const donationController = require('./controllers/donationController');
  donationController.handleDonationWebhook(req, res);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Define API routes
app.use('/api/auth', authRoutes);

// Admin routes - auth first, then other admin routes
app.use('/api/admin', adminAuthRoutes);  // This will handle /api/admin/login
app.use('/api/admin', (req, res, next) => {
  console.log('Admin route accessed:', req.originalUrl);
  next();
}, adminRoutes);
app.use('/api/artist', artistRoutes);
app.use('/api/venue', venueRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/event-team', eventTeamRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/daily-events', dailyEventRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/qrs', qrRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/hornbill-merch', merchRoutes);
// app.use('/api/tickets', ticketRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/space-booking', spaceBookingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/support', supportChatRoutes);
app.use('/api/admin/support', adminSupportChatRoutes);
app.use('/api/hero-images', heroImageRoutes);
app.use('/api/annie-musical', annieMusicalRoutes);
app.use('/api/nis/registrations', nisRegistrationRoutes);
app.use('/api/admin/bikerbash', bikerBashRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/aiko', aikoHallRoutes);
app.use('/api/melita', melitaRoutes);
app.use('/api/helitaxii', heliTaxiiRoutes);
app.use('/api/arena-partner', arenaPartnerRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/admin/sports', sportsAdminRoutes);
app.use('/api/admin/venues', venueAdminRoutes);
app.use('/api/system', systemConfigRoutes);
app.use('/api/dance-league', danceLeagueRoutes);
app.use('/api/livestream', livestreamRoutes);
app.use('/api/livestream/purchase', livestreamPaymentRoutes);
app.use('/api/livestream/chat', livestreamChatRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/terms', adminTermsRoutes);
app.use('/api/public/terms', publicTermsRoutes);
app.use('/api/futsal', futsalTournamentRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Ahibi 3.0 API');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Import error handler
const errorHandler = require('./middlewares/errorHandler');

// Error handling middleware - must be after all other middleware and routes
app.use(errorHandler.errorHandler);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    await User.updateMany(
      { googleId: null },
      { $unset: { googleId: "" } }
    );

    await User.updateMany(
      { googleId: '' },
      { $unset: { googleId: "" } }
    );

    const userIndexes = await User.collection.indexes();
    const googleIdIndex = userIndexes.find((index) => index.name === 'googleId_1');
    const needsGoogleIdIndexMigration = !googleIdIndex || !googleIdIndex.partialFilterExpression;

    if (needsGoogleIdIndexMigration) {
      if (googleIdIndex) {
        await User.collection.dropIndex('googleId_1');
      }

      await User.collection.createIndex(
        { googleId: 1 },
        {
          name: 'googleId_1',
          unique: true,
          partialFilterExpression: {
            googleId: { $exists: true, $type: 'string' }
          }
        }
      );
    }
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// Initialize server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  // // Start the booking cleanup service
  // const bookingCleanupService = require('./services/bookingCleanupService');
  // bookingCleanupService.start();
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO server ready for livestream chat`);
  });
});
