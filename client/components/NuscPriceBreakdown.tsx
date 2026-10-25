"use client";

type NuscPriceItem = {
  passId: string;
  quantity: number;
  actualUnitPrice: number;
  checkoutUnitPrice: number;
};

const PASS_NAMES: Record<string, string> = {
  "general-single": "General Pass · Single Match",
  "general-season": "General Season Pass",
  "premium-single": "Premium Pass · Single Match",
  "premium-season": "Premium Season Pass",
  "suite-single": "United Suite · Single Person",
  "suite-box-single": "United Suite · Full Box",
};

const roundRupees = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

const formatRupees = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

function getPriceBreakdown(actual: number, afterTax: number) {
  const sportsDevelopmentFund = roundRupees(actual * 0.1);
  const convenienceFee = roundRupees(actual * 0.1);

  return { actual, sportsDevelopmentFund, convenienceFee, afterTax };
}

export default function NuscPriceBreakdown({ items }: { items: NuscPriceItem[] }) {
  const lines = items.filter((item) => item.quantity > 0 && PASS_NAMES[item.passId]);
  if (lines.length === 0) return null;

  return (
    <section aria-label="NUSC ticket price summary" className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Ticket price summary</h3>
      <div className="mt-3 space-y-4">
        {lines.map(({ passId, quantity, actualUnitPrice, checkoutUnitPrice }) => {
          const price = getPriceBreakdown(actualUnitPrice, checkoutUnitPrice);
          const amount = (value: number) => formatRupees(value * quantity);

          return (
            <div key={passId} className="border-t border-gray-200 pt-3 first:border-0 first:pt-0">
              <div className="mb-2 flex justify-between gap-3 text-xs font-semibold text-gray-800">
                <span>{PASS_NAMES[passId]}{quantity > 1 ? ` × ${quantity}` : ""}</span>
                <span>{amount(price.afterTax)}</span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between gap-3"><span>Actual price</span><span>{amount(price.actual)}</span></div>
                <div className="flex justify-between gap-3"><span>Sports Development Fund (10%)</span><span>{amount(price.sportsDevelopmentFund)}</span></div>
                <div className="flex justify-between gap-3"><span>Convenience fee (10%)</span><span>{amount(price.convenienceFee)}</span></div>
                <div className="flex justify-between gap-3 border-t border-gray-200 pt-1 font-semibold text-gray-900">
                  <span>After Tax</span><span>{amount(price.afterTax)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
