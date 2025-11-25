# Aiko Hall Booking System

A comprehensive full-stack booking system specifically designed for Aiko Hall, a premium event and banquet hall in Dimapur, Nagaland.

## 🏛️ Venue Information

**Aiko Hall** is a premium indoor venue with the following specifications:

- **Address**: Aiko Greens, Jorepukhri, purana bazaar - 797112, Dimapur, Nagaland
- **Contact Person**: Aren, Dimapur
- **Phone Numbers**: +91 90894 40443, +91 96126 50551
- **Venue Types**: Concert/Event Hall, Private Banquet Hall
- **Maximum Capacity**: 250 guests
- **Minimum Booking Duration**: 6 hours
- **Facilities**: In-house catering, Parking, Sound system, Stage/Platform, Power backup, Accommodation/Stay, Air conditioned

## 🚀 Features. 

### User-Facing Features

1. **Venue Details Page** (`/aiko-hall`)
   - Complete venue information display
   - Interactive calendar with availability
   - Real-time booking form
   - Guest count validation (max 250)
   - Minimum duration enforcement (6 hours)
   - Conflict prevention for overlapping bookings

2. **Booking Flow**
   - Date selection with unavailable dates highlighted
   - Time slot selection with duration validation
   - Customer information collection
   - Special notes/requirements
   - Instant availability checking
   - Success/failure notifications

### Admin Panel Features

1. **Dashboard Overview**
   - Total bookings statistics
   - Pending approvals count
   - Upcoming events tracking
   - Revenue metrics

2. **Booking Management**
   - View all bookings in table format
   - Filter by status (pending, approved, rejected, etc.)
   - Search by customer name, email, or phone
   - Approve/reject bookings with reasons
   - Add admin notes
   - Export bookings to CSV

3. **Calendar View**
   - Visual representation of all bookings
   - Color-coded by status
   - Easy date-based navigation

4. **Venue Settings**
   - Update maximum capacity
   - Modify minimum booking hours
   - Edit booking terms and conditions
   - Toggle facility availability
   - Override default settings

## 🛠️ Technical Implementation

### Backend (Node.js + Express + MongoDB)

#### Models
- **AikoHall**: Fixed venue information with admin-configurable settings
- **AikoHallBooking**: Customer bookings with validation and status tracking

#### API Endpoints
```
GET    /api/aiko                    - Get venue details
GET    /api/aiko/bookings           - Get all bookings (with filters)
POST   /api/aiko/bookings           - Create new booking
GET    /api/aiko/bookings/:id       - Get specific booking
PUT    /api/aiko/bookings/:id/status - Update booking status (Admin)
GET    /api/aiko/stats              - Get booking statistics (Admin)
PUT    /api/aiko/settings           - Update venue settings (Admin)
```

#### Key Features
- **Conflict Prevention**: Advanced algorithm to prevent double bookings
- **Validation**: Comprehensive input validation and business rules
- **Authentication**: Admin-only routes with JWT protection
- **Statistics**: Real-time booking analytics

### Frontend (Next.js + TypeScript + Tailwind CSS)

#### Pages
- **`/aiko-hall`**: Public venue page with booking form
- **`/admin`**: Admin panel with Aiko Hall management section

#### Components
- **AikoHallPage**: Main venue page with calendar and booking form
- **AikoHallManagement**: Admin panel for managing bookings and settings

#### Key Features
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: Instant availability checking
- **Form Validation**: Client-side validation with server-side verification
- **Calendar Integration**: Interactive date picker with availability
- **Export Functionality**: CSV export for booking data

## 📋 Booking Process

### For Customers
1. Visit `/aiko-hall` page
2. View venue information and facilities
3. Select available date from calendar
4. Choose start and end times (minimum 6 hours)
5. Enter guest count (maximum 250)
6. Fill in contact information
7. Add special notes if needed
8. Submit booking request
9. Receive confirmation

### For Admins
1. Access admin panel at `/admin`
2. Navigate to "Aiko Hall" section
3. View pending bookings
4. Review booking details
5. Approve/reject with reasons
6. Add admin notes
7. Monitor statistics and calendar

## 🔧 Installation & Setup

### Backend Setup
1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Add your MongoDB URI and other configurations
   ```

3. Run the test script to verify setup:
   ```bash
   node test-aiko-hall.js
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## 🧪 Testing

The system includes comprehensive testing:

1. **Backend Tests**: Run `node test-aiko-hall.js` to test:
   - Database connectivity
   - Model creation and validation
   - Booking conflict detection
   - Status updates
   - Statistics calculation

2. **Frontend Tests**: Manual testing of:
   - Booking form validation
   - Calendar availability
   - Admin panel functionality
   - Export features

## 📊 Database Schema

### AikoHall Collection
```javascript
{
  name: String (default: "Aiko Hall"),
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  contactPerson: {
    name: String,
    phone: [String],
    email: String
  },
  maxCapacity: Number (default: 250),
  minBookingHours: Number (default: 6),
  facilities: Object,
  adminSettings: Object,
  totalBookings: Number,
  totalRevenue: Number
}
```

### AikoHallBooking Collection
```javascript
{
  customer: {
    name: String,
    phone: String,
    email: String
  },
  bookingDate: Date,
  startTime: String,
  endTime: String,
  duration: Number,
  guestCount: Number,
  specialNotes: String,
  status: String (pending/approved/rejected/cancelled/completed),
  rejectionReason: String,
  adminNotes: String,
  bookedAt: Date,
  approvedAt: Date,
  rejectedAt: Date
}
```

## 🔒 Security Features

- **Input Validation**: Server-side validation for all inputs
- **Authentication**: JWT-based admin authentication
- **Rate Limiting**: Protection against spam bookings
- **Data Sanitization**: XSS and injection prevention
- **CORS Configuration**: Secure cross-origin requests

## 📈 Future Enhancements

1. **Payment Integration**: Razorpay integration for advance payments
2. **Email Notifications**: Automated booking confirmations
3. **SMS Alerts**: Real-time booking notifications
4. **Advanced Analytics**: Revenue tracking and reporting
5. **Multi-language Support**: Local language support
6. **Mobile App**: Native mobile application
7. **Integration**: Connect with existing Ahibi platform

## 🐛 Troubleshooting

### Common Issues

1. **Booking Conflicts**: Ensure proper time format (HH:MM) and check for overlapping bookings
2. **Validation Errors**: Verify guest count doesn't exceed capacity and duration meets minimum requirements
3. **Admin Access**: Ensure proper JWT token for admin routes
4. **Database Connection**: Check MongoDB URI and connection status

### Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

## 📝 License

This project is part of the Ahibi platform and follows the same licensing terms.

---

**Built with ❤️ for Aiko Hall, Dimapur**
