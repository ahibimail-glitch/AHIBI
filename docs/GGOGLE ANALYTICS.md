# Google Analytics 4 (GA4) Integration Guide

## Overview

This project uses Google Analytics 4 (GA4) to track:

* Page views across Next.js App Router navigation
* Event page visits
* Booking funnel interactions
* Razorpay payment conversions
* Ticket generation
* Custom business metrics

The integration is designed to:

* Work with Next.js App Router
* Avoid duplicate page view tracking
* Support TypeScript
* Provide reusable analytics helpers
* Track business-critical event booking flows

---

## Measurement ID

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-6HK1GRM61F
```

Create a `.env.local` file and add:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-6HK1GRM61F
```

Restart the application after updating environment variables.

---

# Analytics Architecture

## Components

### GoogleAnalytics

Loads the GA4 script and initializes Google Analytics.

Location:

```text
client/components/analytics/GoogleAnalytics.tsx
```

Responsibilities:

* Loads `gtag.js`
* Initializes GA4
* Disables automatic page views

```js
gtag('config', MEASUREMENT_ID, {
  send_page_view: false,
});
```

---

### GoogleAnalyticsPageView

Location:

```text
client/components/analytics/GoogleAnalyticsPageView.tsx
```

Responsibilities:

* Detects route changes
* Sends page_view events
* Prevents duplicate tracking

Uses:

```tsx
usePathname()
useSearchParams()
```

---

## Analytics Library

Location:

```text
client/lib/analytics
```

Files:

```text
constants.ts
gtag.ts
index.ts
```

Provides reusable tracking methods.

---

# Page View Tracking

Page views are tracked automatically whenever users navigate between routes.

Examples:

```text
/
```

```text
/events/123
```

```text
/events/456
```

```text
/profile
```

```text
/checkout
```

No additional setup is required.

---

# Available Tracking Functions

## Generic Event

```ts
trackEvent({
  eventName: "newsletter_signup",
  params: {
    source: "footer",
  },
});
```

---

## Page View

```ts
trackPageView("/events/123");
```

---

## Purchase

```ts
trackPurchase({
  transaction_id: paymentId,
  value: 1500,
  currency: "INR",
  items: [
    {
      item_id: "vip",
      item_name: "VIP Pass",
      price: 1500,
      quantity: 1,
    },
  ],
});
```

---

# Ahibi Event Tracking

## Event View

Tracks when a user opens an event page.

```ts
trackEventView({
  event_id: event._id,
  event_name: event.title,
});
```

Current Location:

```text
app/events/[id]/page.tsx
```

---

## Booking Started

Tracks when a user clicks Book Now.

```ts
trackBookingStarted({
  event_id: event._id,
  event_name: event.title,
});
```

Current Location:

```text
handleBuyNow()
```

---

## Checkout Started

Tracks when checkout begins.

```ts
trackCheckoutStarted({
  event_id: event._id,
  event_name: event.title,
  amount: totalAmount,
});
```

Current Locations:

```text
app/events/[id]/checkout/page.tsx
```

Before:

* Free booking completion
* Razorpay payment initialization

---

## Payment Success

Tracks successful payment completion.

```ts
trackPaymentSuccess({
  event_id: event._id,
  event_name: event.title,
  amount: totalAmount,
  currency: "INR",
});
```

Current Location:

```text
Razorpay success handler
```

---

## Payment Failed

Tracks failed payments.

```ts
trackPaymentFailed({
  event_id: event._id,
  event_name: event.title,
});
```

Current Locations:

* Payment verification failure
* Razorpay failure callback
* API errors

---

## Ticket Generated

Tracks ticket creation.

```ts
trackTicketGenerated({
  event_id: event._id,
  event_name: event.title,
  ticket_count: quantity,
});
```

Current Location:

```text
app/events/[id]/bookings/page.tsx
```

---

# Event Flow

```text
Event Page Opened
        ↓
event_view
        ↓
Book Now Click
        ↓
booking_started
        ↓
Checkout Page
        ↓
checkout_started
        ↓
Payment Attempt
       / \
      /   \
Success   Failure
  ↓          ↓
payment_success
payment_failed
  ↓
purchase
  ↓
ticket_generated
```

---

# Verification

## Realtime Reports

Open:

Google Analytics → Reports → Realtime

Verify:

* Active users
* Current page
* Custom events

---

## DebugView

Open:

Admin → Data Display → DebugView

Verify:

* page_view
* event_view
* booking_started
* checkout_started
* payment_success
* payment_failed
* ticket_generated
* purchase

---

# Recommended GA4 Conversions

Mark the following events as conversions:

```text
payment_success
```

Optional:

```text
booking_started
```

```text
checkout_started
```

---

# Recommended Custom Dimensions

Create custom dimensions for:

```text
event_id
```

```text
event_name
```

```text
ticket_count
```

```text
amount
```

This allows event-level reporting inside GA4.

---

# Future Integrations

Recommended future tracking:

## Daily Events

```text
app/events/daily/[id]/checkout/page.tsx
```

Track:

* checkout_started
* payment_success
* payment_failed

---

## Venue Bookings

```text
app/allVenues/**/*
```

Track:

* venue_view
* booking_started
* checkout_started
* payment_success

---

## Payment Success Page

```text
app/payment-success/page.tsx
```

Track:

* payment_success
* purchase

---

# Deployment Checklist

* [ ] Add Measurement ID to `.env.local`
* [ ] Verify page_view events
* [ ] Verify booking funnel events
* [ ] Verify purchase tracking
* [ ] Verify DebugView events
* [ ] Mark payment_success as conversion
* [ ] Create custom dimensions
* [ ] Test on production deployment

---

# Success Metrics

The analytics implementation enables tracking:

* Most viewed events
* Most booked events
* Revenue by event
* Checkout conversion rate
* Payment failure rate
* Ticket generation volume
* User drop-off points in the booking funnel

These insights help optimize event performance, marketing campaigns, and revenue generation across the Ahibi platform.
