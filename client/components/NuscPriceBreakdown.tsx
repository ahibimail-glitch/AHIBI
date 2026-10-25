"use client";

type NuscPriceItem = {
  passId: string;
  quantity: number;
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

const formatRupees = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

export default function NuscPriceBreakdown({ items }: { items: NuscPriceItem[] }) {
  const lines = items.filter((item) => item.quantity > 0 && PASS_NAMES[item.passId]);
  if (lines.length === 0) return null;

  return (
    <section aria-label="NUSC ticket price summary" className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Ticket price summary</h3>
      <div className="mt-3 space-y-2">
        {lines.map(({ passId, quantity, checkoutUnitPrice }) => (
          <div key={passId} className="flex justify-between gap-3 text-xs font-semibold text-gray-800">
            <span>{PASS_NAMES[passId]}{quantity > 1 ? " × " + quantity : ""}</span>
            <span>{formatRupees(checkoutUnitPrice * quantity)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
