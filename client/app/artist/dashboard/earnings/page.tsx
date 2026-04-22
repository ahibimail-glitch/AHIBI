"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EarningsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings & Payouts</CardTitle>
        <CardDescription>Track your income and payment history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded-lg text-center">
            <h3 className="font-semibold text-lg">This Month</h3>
            <p className="text-3xl font-bold text-green-600">₹1,25,000</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <h3 className="font-semibold text-lg">Pending</h3>
            <p className="text-3xl font-bold text-orange-600">₹45,000</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <h3 className="font-semibold text-lg">Total Earned</h3>
            <p className="text-3xl font-bold">₹8,75,000</p>
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Recent Transactions</h3>
          <p className="text-center text-muted-foreground">
            Transaction history would be displayed here
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
