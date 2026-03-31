"use client";

import { Card, CardContent } from "@/components/ui/card";

type ConvenienceConfig = {
  percentage?: number;
  fixedAmount?: number; // treated as per-ticket fixed fee on checkout
  includeGst?: boolean;
  gstPercentage?: number;
};

type TicketLike = {
  _id: string;
  name: string;
  price: number;
  basePrice?: number;
};

export default function CheckoutDetailedBreakdown({
  selectedTickets,
  convenience,
}: {
  selectedTickets: Map<string, { ticket: TicketLike; quantity: number }>;
  convenience?: ConvenienceConfig;
}) {
  const includeGst = convenience?.includeGst ?? false;
  const gstPercentage = convenience?.gstPercentage ?? 18;
  const conveniencePercentage = convenience?.percentage ?? 0;
  const convenienceFixedPerTicket = convenience?.fixedAmount ?? 0;

  const rows = Array.from(selectedTickets.values())
    .filter((x) => x.quantity > 0)
    .map(({ ticket, quantity }) => {
      const unitBase = typeof ticket.basePrice === "number" ? ticket.basePrice : ticket.price;
      const baseTotal = unitBase * quantity;

      const gstTotal = includeGst ? (baseTotal * gstPercentage) / 100 : 0;
      const conveniencePctTotal = conveniencePercentage ? (baseTotal * conveniencePercentage) / 100 : 0;
      const convenienceFixedTotal = convenienceFixedPerTicket * quantity;

      const finalTotal = baseTotal + gstTotal + conveniencePctTotal + convenienceFixedTotal;

      return {
        key: ticket._id,
        name: ticket.name,
        quantity,
        unitBase,
        baseTotal,
        gstTotal,
        conveniencePctTotal,
        convenienceFixedTotal,
        finalTotal,
      };
    });

  const totals = rows.reduce(
    (acc, r) => {
      acc.base += r.baseTotal;
      acc.gst += r.gstTotal;
      acc.convPct += r.conveniencePctTotal;
      acc.convFixed += r.convenienceFixedTotal;
      acc.final += r.finalTotal;
      return acc;
    },
    { base: 0, gst: 0, convPct: 0, convFixed: 0, final: 0 }
  );

  const hasAnyFees =
    includeGst || conveniencePercentage !== 0 || convenienceFixedPerTicket !== 0;

  if (!hasAnyFees || rows.length === 0) return null;

  return (
    <Card className="bg-gray-50 border-gray-200 mt-3">
      <CardContent className="p-3 space-y-3">
        <div className="text-sm font-medium text-gray-700">Detailed price breakdown</div>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{r.name}</div>
                  <div className="text-xs text-gray-500">
                    {r.quantity} × ₹{r.unitBase.toFixed(2)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  ₹{r.finalTotal.toFixed(2)}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Base</span>
                  <span>₹{r.baseTotal.toFixed(2)}</span>
                </div>

                {includeGst && (
                  <div className="flex justify-between text-gray-600">
                    <span>GST ({gstPercentage}%)</span>
                    <span>₹{r.gstTotal.toFixed(2)}</span>
                  </div>
                )}

                {conveniencePercentage !== 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Convenience ({conveniencePercentage}%)</span>
                    <span>₹{r.conveniencePctTotal.toFixed(2)}</span>
                  </div>
                )}

                {convenienceFixedPerTicket !== 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Convenience (Fixed) ({r.quantity} × ₹{convenienceFixedPerTicket.toFixed(2)})</span>
                    <span>₹{r.convenienceFixedTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-2 space-y-1 text-xs">
          <div className="flex justify-between text-gray-700">
            <span>Total base</span>
            <span>₹{totals.base.toFixed(2)}</span>
          </div>
          {includeGst && (
            <div className="flex justify-between text-gray-700">
              <span>Total GST</span>
              <span>₹{totals.gst.toFixed(2)}</span>
            </div>
          )}
          {conveniencePercentage !== 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Total convenience (%)</span>
              <span>₹{totals.convPct.toFixed(2)}</span>
            </div>
          )}
          {convenienceFixedPerTicket !== 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Total convenience (fixed)</span>
              <span>₹{totals.convFixed.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1">
            <span>Grand total (with fees)</span>
            <span className="text-green-700">₹{totals.final.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

