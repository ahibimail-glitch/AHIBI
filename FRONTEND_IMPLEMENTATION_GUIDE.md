# Ahibi Sports Integration - Frontend Implementation Guide

## 📦 Required Dependencies

Install the following package for toast notifications:

```bash
cd client
npm install react-hot-toast
```

## 🗂️ Files Created

### API Service Layer
- ✅ `client/lib/api/sports.ts` - Complete API service with all endpoints

### Arena Partner Pages
- ✅ `client/app/arena-partner/auth/page.tsx` - Authentication (Login/Signup with OTP)
- ✅ `client/app/arena-partner/dashboard/page.tsx` - Dashboard with stats

### Pages to Create (Next Steps)

#### Arena Partner Pages
1. `client/app/arena-partner/venues/page.tsx` - Venue list
2. `client/app/arena-partner/venues/create/page.tsx` - Create venue
3. `client/app/arena-partner/venues/[id]/page.tsx` - Venue details
4. `client/app/arena-partner/venues/[id]/edit/page.tsx` - Edit venue
5. `client/app/arena-partner/courts/page.tsx` - Court management
6. `client/app/arena-partner/bookings/page.tsx` - Booking calendar
7. `client/app/arena-partner/payouts/page.tsx` - Payout history
8. `client/app/arena-partner/analytics/page.tsx` - Revenue analytics
9. `client/app/arena-partner/profile/page.tsx` - Profile & KYC

#### User Pages
1. `client/app/sports/page.tsx` - Venue discovery
2. `client/app/sports/venues/[id]/page.tsx` - Venue details
3. `client/app/sports/booking/page.tsx` - Booking flow
4. `client/app/sports/my-bookings/page.tsx` - User bookings

#### Admin Pages
1. `client/app/admin/sports/partners/page.tsx` - Arena partners management
2. `client/app/admin/sports/venues/page.tsx` - Venues management
3. `client/app/admin/sports/bookings/page.tsx` - All bookings
4. `client/app/admin/sports/payouts/page.tsx` - Payout management
5. `client/app/admin/sports/analytics/page.tsx` - Analytics dashboard

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd client
npm install react-hot-toast
```

### 2. Update Environment Variables
Add to `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access Arena Partner Portal
Navigate to: `http://localhost:3000/arena-partner/auth`

## 📱 User Flows

### Arena Partner Flow
1. **Registration**: `/arena-partner/auth` → Enter phone → Verify OTP → Complete details
2. **Dashboard**: `/arena-partner/dashboard` → View stats and quick actions
3. **Add Venue**: Dashboard → "Add New Venue" → Fill form → Submit for approval
4. **Add Courts**: Venue details → "Add Court" → Configure pricing → Save
5. **Manage Bookings**: Dashboard → "View Bookings" → Check-in/Complete bookings
6. **View Payouts**: Dashboard → "Payouts" → View payout history

### User Flow
1. **Discover**: `/sports` → Search by sport/location → Filter results
2. **View Details**: Click venue → See courts, facilities, reviews
3. **Book**: Select court → Choose date → Pick slots → Complete payment
4. **My Bookings**: `/sports/my-bookings` → View/cancel bookings

### Admin Flow
1. **Approve Partners**: `/admin/sports/partners` → Review KYC → Approve/Reject
2. **Approve Venues**: `/admin/sports/venues` → Review details → Approve/Reject
3. **Manage Payouts**: `/admin/sports/payouts` → Process/Complete payouts
4. **View Analytics**: `/admin/sports/analytics` → Revenue insights

## 🎨 Design System

### Colors
- Primary: Orange (#EA580C - orange-600)
- Secondary: Blue (#2563EB - blue-600)
- Success: Green (#16A34A - green-600)
- Warning: Yellow (#CA8A04 - yellow-600)
- Error: Red (#DC2626 - red-600)

### Components to Reuse
- Use existing Tailwind classes
- Follow the pattern from other dashboards (artist, organizer, venue)
- Maintain consistency with Ahibi design language

## 🔐 Authentication

### Token Storage
```typescript
// Arena Partner
localStorage.setItem('arenaPartnerToken', token);
const token = localStorage.getItem('arenaPartnerToken');

// User (existing)
localStorage.setItem('token', token);
const token = localStorage.getItem('token');
```

### Protected Routes
Add middleware check in each protected page:
```typescript
useEffect(() => {
  const token = localStorage.getItem('arenaPartnerToken');
  if (!token) {
    router.push('/arena-partner/auth');
  }
}, []);
```

## 💳 Payment Integration

### Razorpay Setup
```typescript
// Load Razorpay script
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Create order and open Razorpay
const handlePayment = async (orderData) => {
  const res = await loadRazorpay();
  if (!res) {
    alert('Razorpay SDK failed to load');
    return;
  }

  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: orderData.amount,
    currency: orderData.currency,
    order_id: orderData.orderId,
    name: 'Ahibi Sports',
    description: 'Court Booking',
    handler: async (response) => {
      // Verify payment
      await sportsApi.verifyPayment({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
        // ... other booking details
      });
    },
  };

  const paymentObject = new window.Razorpay(options);
  paymentObject.open();
};
```

## 📊 State Management

### Use React Hooks
```typescript
// Loading states
const [loading, setLoading] = useState(false);

// Data states
const [venues, setVenues] = useState([]);
const [bookings, setBookings] = useState([]);

// Form states
const [formData, setFormData] = useState({});

// Error handling
try {
  const response = await api.call();
  // Handle success
} catch (error) {
  console.error(error);
  // Show error toast
}
```

## 🗺️ Routing Structure

```
/arena-partner
  /auth                    - Login/Signup
  /dashboard              - Main dashboard
  /venues                 - Venue list
  /venues/create          - Create venue
  /venues/[id]            - Venue details
  /venues/[id]/edit       - Edit venue
  /courts                 - Court list
  /bookings               - Booking management
  /payouts                - Payout history
  /analytics              - Revenue analytics
  /profile                - Profile & KYC

/sports
  /                       - Venue discovery
  /venues/[id]            - Venue details
  /booking                - Booking flow
  /my-bookings            - User bookings
  /bookings/[id]          - Booking details

/admin/sports
  /partners               - Arena partners
  /venues                 - Venues
  /bookings               - All bookings
  /payouts                - Payout management
  /analytics              - Analytics
```

## 🧪 Testing Checklist

### Arena Partner
- [ ] Registration with OTP
- [ ] Login with OTP
- [ ] Create venue
- [ ] Add court with pricing
- [ ] View bookings
- [ ] Check-in booking
- [ ] View payouts
- [ ] View analytics

### User
- [ ] Search venues
- [ ] Filter by sport/location
- [ ] View venue details
- [ ] Check slot availability
- [ ] Book court with payment
- [ ] View my bookings
- [ ] Cancel booking
- [ ] Add review

### Admin
- [ ] Approve arena partner
- [ ] Approve venue
- [ ] View all bookings
- [ ] Process payout
- [ ] View analytics

## 📝 Next Steps

1. **Install Dependencies**
   ```bash
   npm install react-hot-toast
   ```

2. **Create Remaining Pages** (in priority order)
   - Arena Partner: Venue management pages
   - User: Venue discovery and booking
   - Admin: Management panels

3. **Add Toast Provider**
   Update `client/app/layout.tsx`:
   ```typescript
   import { Toaster } from 'react-hot-toast';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           <Toaster position="top-right" />
           {children}
         </body>
       </html>
     );
   }
   ```

4. **Test All Flows**
   - Complete end-to-end testing
   - Fix any bugs
   - Optimize performance

5. **Deploy**
   - Build for production
   - Deploy frontend
   - Update environment variables

## 🎯 Key Features to Implement

### Priority 1 (Core Functionality)
- ✅ Arena Partner Auth
- ✅ Dashboard
- ⏳ Venue CRUD
- ⏳ Court CRUD
- ⏳ Booking Management
- ⏳ User Venue Discovery
- ⏳ User Booking Flow

### Priority 2 (Enhanced Features)
- ⏳ Analytics Dashboard
- ⏳ Payout Management
- ⏳ Reviews & Ratings
- ⏳ Admin Panels

### Priority 3 (Nice to Have)
- ⏳ Real-time notifications
- ⏳ Calendar view for bookings
- ⏳ Advanced filters
- ⏳ Mobile responsiveness
- ⏳ Dark mode

## 🐛 Common Issues & Solutions

### Issue: Token not persisting
**Solution**: Ensure localStorage is accessed only on client side
```typescript
if (typeof window !== 'undefined') {
  localStorage.setItem('token', value);
}
```

### Issue: API calls failing
**Solution**: Check CORS settings and API URL in .env

### Issue: Razorpay not loading
**Solution**: Ensure script is loaded before opening checkout

### Issue: Toast not showing
**Solution**: Add Toaster component to layout.tsx

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Razorpay Docs](https://razorpay.com/docs/)
- [React Hot Toast](https://react-hot-toast.com/)

---

**Status**: Backend Complete ✅ | Frontend In Progress ⏳

**Last Updated**: January 10, 2026
