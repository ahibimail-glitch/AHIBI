"use client";

type NuscPriceItem = {
  passId: string;
  quantity: number;
  checkoutUnitPrice: number;
};

const PRICE_DETAILS: Record<string, {
  name: string;
  actual: number;
  ssf: number;
  aHibi: number;
  gst?: number;
  afterTax: number;
}> = {
  "general-single": { name: "General Pass · Single Match", actual: 299, ssf: 30, aHibi: 30, afterTax: 360 },
  "general-season": { name: "General Season Pass", actual: 2700, ssf: 270, aHibi: 270, gst: 583.2, afterTax: 3825.2 },
  "premium-single": { name: "Premium Pass · Single Match", actual: 1000, ssf: 100, aHibi: 100, gst: 216, afterTax: 1416 },
  "premium-season": { name: "Premium Season Pass", actual: 9000, ssf: 900, aHibi: 900, gst: 1944, afterTax: 12744 },
  "suite-single": { name: "United Suite · Single Person", actual: 6000, ssf: 600, aHibi: 600, gst: 1296, afterTax: 8896 },
  "suite-box-single": { name: "United Suite · Full Box", actual: 50000, ssf: 5000, aHibi: 5000, gst: 10800, afterTax: 70800 },
};

const formatRupees = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

export default function NuscPriceBreakdown({ items }: { items: NuscPriceItem[] }) {
  const knownItems = items.flatMap((item) => {
    const details = PRICE_DETAILS[item.passId];
    return details && item.quantity > 0 ? [{ ...item, details }] : [];
  });

  if (knownItems.length === 0) return null;

  return (
    <section aria-label="NUSC ticket price breakdown" className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Price breakdown</h3>
      <div className="mt-3 space-y-4">
        {knownItems.map(({ passId, quantity, checkoutUnitPrice, details }) => {
          const scale = quantity;
          const checkoutDifference = checkoutUnitPrice - details.afterTax;

          return (
            <div key={passId} className="border-t border-gray-200 pt-3 first:border-0 first:pt-0">
              <div className="mb-2 flex justify-between gap-3 text-xs font-semibold text-gray-800">
                <span>{details.name}{quantity > 1 ? ` × ${quantity}` : ""}</span>
                <span>{formatRupees(checkoutUnitPrice * quantity)}</span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between gap-3"><span>Actual price</span><span>{formatRupees(details.actual * scale)}</span></div>
                <div className="flex justify-between gap-3"><span>SSF (10%)</span><span>{formatRupees(details.ssf * scale)}</span></div>
                <div className="flex justify-between gap-3"><span>AHIBI (10%)</span><span>{formatRupees(details.aHibi * scale)}</span></div>
                {details.gst !== undefined && (
                  <div className="flex justify-between gap-3"><span>GST (18%)</span><span>{formatRupees(details.gst * scale)}</span></div>
                )}
                <div className="flex justify-between gap-3 border-t border-gray-200 pt-1 font-semibold text-gray-900">
                  <span>After tax (price sheet)</span><span>{formatRupees(details.afterTax * scale)}</span>
                </div>
                {Math.abs(checkoutDifference) > 0.009 && (
                  <p className="text-amber-800">
                    Current checkout price differs from the price sheet by {formatRupees(checkoutDifference * scale)}.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
