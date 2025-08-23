# Organizer Bookings Feature

## Overview
This feature allows organizers to view all bookings for events they have created in their dashboard.

## Implementation Details

### Backend Changes

#### New API Endpoint
- **Route**: `GET /api/bookings/organizer-bookings`
- **Access**: Private (Organizer only)
- **Description**: Returns all bookings for events created by the logged-in organizer

#### Authentication
- Uses existing `auth.protect` middleware
- Validates that the user has `role: 'organizer'`
- Returns bookings only for events where `organizer` field matches the user's ID

#### Data Structure
The endpoint returns bookings with the following structure:
```json
{
  "bookings": [
    {
      "_id": "booking_id",
      "event": {
        "_id": "event_id",
        "title": "Event Title",
        "banner": "banner_url",
        "startDate": "2025-01-15T10:00:00.000Z"
      },
      "user": {
        "_id": "user_id",
        "name": "Customer Name",
        "email": "customer@email.com",
        "phone": "9876543210"
      },
      "quantity": 2,
      "price": 500,
      "total": 1000,
      "status": "confirmed",
      "paymentStatus": "completed",
      "ticketType": "VIP",
      "bookedAt": "2025-01-10T15:30:00.000Z"
    }
  ]
}
```

### Frontend Changes

#### Updated Bookings Component
- **File**: `client/app/organizer/components/Bookings.tsx`
- **Features**:
  - Fetches real booking data from API
  - Displays loading and error states
  - Shows booking statistics (total, confirmed, pending, revenue)
  - Search functionality across customer name, email, and event title
  - Responsive table with booking details

#### Key Features
1. **Real-time Data**: Fetches actual bookings from the database
2. **Statistics Dashboard**: Shows total bookings, confirmed bookings, pending bookings, and total revenue
3. **Search & Filter**: Search through bookings by customer or event name
4. **Status Indicators**: Visual badges for different booking statuses (confirmed, pending, cancelled, checked-in)
5. **Responsive Design**: Works on desktop and mobile devices

#### Table Columns
- Customer (name, email, phone)
- Event title
- Ticket type
- Quantity
- Amount
- Status
- Dates (booking date and event date)
- Actions

### Security
- Only organizers can access their own event bookings
- Authentication token required
- Role-based access control (organizer role only)

### Error Handling
- Graceful handling of network errors
- Loading states for better UX
- Error messages for authentication issues
- Fallback for missing data

## Usage
1. Organizer logs into their dashboard
2. Navigates to the "Bookings" section
3. Views all bookings for their events
4. Can search and filter bookings as needed
5. Can see real-time statistics and revenue data

## Technical Notes
- Uses existing authentication system
- Leverages existing Event and Booking models
- Follows the same API response pattern as other endpoints
- Maintains consistency with existing UI components
