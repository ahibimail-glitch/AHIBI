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
// const artistRoutes = require('./routes/artist.routes');
// const venueRoutes = require('./routes/venue.routes');
// const organizerRoutes = require('./routes/organizer.routes');
// const eventRoutes = require('./routes/event.routes');
// const ticketRoutes = require('./routes/ticket.routes');
// const userRoutes = require('./routes/user.routes');
// const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const { userRouter: supportRoutes, adminRouter: adminSupportRoutes } = require('./routes/support.routes');

// Create Express app
const app = express();

// Set up middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define API routes
app.use('/api/auth', authRoutes);

// Admin routes - auth first, then other admin routes
app.use('/api/admin', adminAuthRoutes);  // This will handle /api/admin/login
app.use('/api/admin', adminRoutes);
// app.use('/api/artists', artistRoutes);
// app.use('/api/venues', venueRoutes);
// app.use('/api/organizers', organizerRoutes);
// app.use('/api/events', eventRoutes);
// app.use('/api/tickets', ticketRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin/support', adminSupportRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Ahibi 3.0 API');
});

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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
