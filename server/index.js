const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require('./routes/adminAuth.routes');
const artistRoutes = require('./routes/artist.routes');
const venueRoutes = require('./routes/venue.routes');
const organizerRoutes = require('./routes/organizer.routes');
const eventRoutes = require('./routes/event.routes');

const uploadRoutes = require('./routes/upload.routes');
// const ticketRoutes = require('./routes/ticket.routes');
// const userRoutes = require('./routes/user.routes');
// const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const bookingRoutes = require('./routes/booking.routes');
const { userRouter: supportRoutes, adminRouter: adminSupportRoutes } = require('./routes/support.routes');
const qrRoutes = require('./routes/qr.routes');
const paymentRoutes = require('./routes/payment.routes');
const heroImageRoutes = require('./routes/heroImageRoutes');
const annieMusicalRoutes = require('./routes/annieMusicalRoutes');
const nisRegistrationRoutes = require('./routes/nisRegistration.routes');
const bikerBashRoutes = require('./routes/bikerBash.routes');
const couponRoutes = require('./routes/coupon.routes');



// Create Express app
const app = express();
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

// Set up middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Mount Razorpay webhook BEFORE json parser to preserve raw body for signature verification
app.post('/api/payments/webhook/razorpay', express.raw({ type: '*/*' }), (req, res, next) => {
  // Store the raw body for the webhook controller
  req.rawBody = req.body;
  next();
}, (req, res) => {
  // Import the controller dynamically to avoid circular dependencies
  const paymentController = require('./controllers/paymentController');
  paymentController.razorpayWebhook(req, res);
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
app.use('/api/events', eventRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/qrs', qrRoutes);
app.use('/api/payments', paymentRoutes);
// app.use('/api/tickets', ticketRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/hero-images', heroImageRoutes);
app.use('/api/annie-musical', annieMusicalRoutes);
app.use('/api/nis/registrations', nisRegistrationRoutes);
app.use('/api/admin/bikerbash', bikerBashRoutes);
app.use('/api/coupons', couponRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Ahibi 3.0 API');
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
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// Initialize server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  // Start the booking cleanup service
  const bookingCleanupService = require('./services/bookingCleanupService');
  bookingCleanupService.start();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
