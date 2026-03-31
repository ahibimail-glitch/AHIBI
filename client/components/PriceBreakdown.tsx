"use client";

import { Card, CardContent } from "@/components/ui/card";

interface PriceBreakdownProps {
  basePrice: number;
  includeGst: boolean;
  gstPercentage: number;
  includeConvenience: boolean;
  conveniencePercentage: number;
  convenienceFixedAmount: number;
}

export default function PriceBreakdown({
  basePrice,
  includeGst,
  gstPercentage,
  includeConvenience,
  conveniencePercentage,
  convenienceFixedAmount,
}: PriceBreakdownProps) {
  const gstAmount = includeGst ? (basePrice * gstPercentage) / 100 : 0;
  const convenienceAmount = includeConvenience 
    ? (basePrice * conveniencePercentage) / 100 + convenienceFixedAmount 
    : 0;
  const finalPrice = basePrice + gstAmount + convenienceAmount;

  // Only show breakdown if there are additional fees
  if (!includeGst && !includeConvenience) {
    return null;
  }

  return (
    <Card className="bg-gray-50 border-gray-200 mt-2">
      <CardContent className="p-3 space-y-1">
        <div className="text-sm font-medium text-gray-700 mb-2">Price Breakdown:</div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Base Price:</span>
          <span className="font-medium">₹{basePrice.toFixed(2)}</span>
        </div>

        {includeGst && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">GST ({gstPercentage}%):</span>
            <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
          </div>
        )}

        {includeConvenience && (
          <>
            {(conveniencePercentage > 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Convenience ({conveniencePercentage}%):</span>
                <span className="font-medium">₹{((basePrice * conveniencePercentage) / 100).toFixed(2)}</span>
              </div>
            )}
            {convenienceFixedAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Convenience (Fixed):</span>
                <span className="font-medium">₹{convenienceFixedAmount.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-gray-900">Final Price:</span>
            <span className="text-green-600">₹{finalPrice.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
