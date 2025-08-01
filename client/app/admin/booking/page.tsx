"use client";

import React from 'react';
import ManualBooking from '../components/ManualBooking';

export default function BookingPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Manual Ticket Booking</h1>
      <ManualBooking />
    </div>
  );
}
