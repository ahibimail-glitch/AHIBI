# Hornbill Festival 2025 - Next.js Conversion

## Overview
Successfully converted the Hornbill Festival 2025 project from React Router (Lovable) to Next.js App Router format.

## Changes Made

### 1. **Main Page Conversion**
- **File**: `page.tsx`
- Removed React Router dependencies (`BrowserRouter`, `Routes`, `Route`)
- Converted to Next.js page component with `"use client"` directive
- Updated navigation to use Next.js `Link` component
- Changed routing from client-side to file-based routing

### 2. **Created Route Folders**
Created Next.js route structure:
- `/HornbillFestival2025/` - Main landing page
- `/HornbillFestival2025/daily-pass/` - Daily pass booking
- `/HornbillFestival2025/festival-pass/` - 10-day festival pass
- `/HornbillFestival2025/music-festival/` - Music festival tickets
- `/HornbillFestival2025/booking/` - Booking checkout page

### 3. **Component Updates**

#### **Navbar Component**
- Replaced `react-router-dom` imports with Next.js equivalents
- Changed `Link` from React Router to Next.js `Link`
- Replaced `useLocation()` with `usePathname()` from `next/navigation`
- Updated all route paths to include `/HornbillFestival2025` prefix
- Changed `to` prop to `href` prop for Link components

#### **HeroBanner Component**
- Added `"use client"` directive for framer-motion animations
- No routing changes needed (display component only)

#### **TicketCard Component**
- Added `"use client"` directive
- Made `onClick` optional to support both Link wrapper and direct click
- Added conditional rendering for button/div based on onClick presence

#### **DaySelector Component**
- Added `"use client"` directive for animations
- No routing changes needed (controlled component)

#### **Footer Component**
- No changes needed (static component)

### 4. **Page Conversions**

#### **Daily Pass Page**
- Replaced `useNavigate()` with Next.js `useRouter()`
- Changed navigation from `navigate()` to `router.push()`
- Updated route parameters to use query strings instead of state
- Changed `navigate("/booking", { state: {...} })` to `router.push("/HornbillFestival2025/booking?...")`

#### **Festival Pass Page**
- Same changes as Daily Pass page
- Updated booking flow to use URL parameters

#### **Music Festival Page**
- Same routing changes as other pages
- Converted state-based navigation to query parameter navigation
- Updated `URLSearchParams` for complex parameter handling

#### **Booking Page**
- Replaced `useLocation()` with `useSearchParams()` from Next.js
- Changed from reading `location.state` to reading URL query parameters
- Added `useEffect` to parse and validate query parameters
- Updated back navigation to use `router.back()`

### 5. **CSS Updates**
Added custom CSS classes to `globals.css`:
- `.gradient-hero` - Primary gradient for buttons and highlights
- `.gradient-card` - Card background gradient
- `.gradient-premium` - Premium section gradient
- `.glass-effect` - Glassmorphism effect for navbar
- `.shadow-glow` - Glowing shadow effect
- `.shadow-premium` - Premium shadow effect
- `.shadow-card` - Card shadow
- `.shadow-hover` - Hover shadow effect
- `.transition-smooth` - Smooth transitions
- `.transition-bounce` - Bouncy transitions
- `.animate-float` - Floating animation keyframes

## File Structure

```
HornbillFestival2025/
├── page.tsx                    # Main landing page
├── components/
│   ├── Navbar.tsx             # Navigation component
│   ├── Footer.tsx             # Footer component
│   ├── HeroBanner.tsx         # Hero banner component
│   ├── TicketCard.tsx         # Ticket card component
│   └── DaySelector.tsx        # Day selector component
├── daily-pass/
│   └── page.tsx               # Daily pass booking page
├── festival-pass/
│   └── page.tsx               # Festival pass booking page
├── music-festival/
│   └── page.tsx               # Music festival booking page
├── booking/
│   └── page.tsx               # Booking checkout page
└── README.md                   # This file
```

## Routes

- `GET /HornbillFestival2025` - Main landing page
- `GET /HornbillFestival2025/daily-pass` - Daily pass selection
- `GET /HornbillFestival2025/festival-pass` - Festival pass selection
- `GET /HornbillFestival2025/music-festival` - Music festival tickets
- `GET /HornbillFestival2025/booking?type=...&category=...&price=...` - Booking page

## Key Differences from Lovable Version

### Routing
- **Before**: Client-side routing with React Router
- **After**: File-based routing with Next.js App Router

### Navigation
- **Before**: `<Link to="/path">` and `navigate("/path", { state: {...} })`
- **After**: `<Link href="/path">` and `router.push("/path?param=value")`

### State Management
- **Before**: Route state via `location.state`
- **After**: URL query parameters via `useSearchParams()`

### Client Components
- **Before**: All components client-side by default
- **After**: Explicit `"use client"` directive for interactive components

## Assets Needed

The following image assets are referenced but need to be added to `/public/images/`:
- `hornbill-hero.jpg` - Main hero banner
- `hornbill-daily.jpg` - Daily pass banner
- `hornbill-music.jpg` - Music festival banner

## Next Steps

1. **Add Images**: Place hero images in `/public/images/` directory
2. **Backend Integration**: Connect booking page to actual payment gateway (Razorpay)
3. **Database Integration**: Store bookings in database
4. **Email Notifications**: Set up email confirmation system
5. **Testing**: Test all routes and booking flows
6. **Responsive Design**: Verify mobile responsiveness

## Dependencies

All required dependencies are already in `package.json`:
- `next` - Next.js framework
- `react` - React library
- `framer-motion` - Animations
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `@radix-ui/*` - UI components

## Notes

- All components use `"use client"` directive where needed for interactivity
- Booking flow uses URL parameters instead of route state for better sharability
- Custom CSS classes maintain the original design aesthetic
- Navigation paths include `/HornbillFestival2025` prefix for proper routing
