"use client";

import React from 'react';
import QrScanner from '../components/QrScanner';

export default function ScanPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Event Entry Verification</h1>
      <QrScanner />
    </div>
  );
}
