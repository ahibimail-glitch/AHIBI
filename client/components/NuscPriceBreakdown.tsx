"use client";

type NuscPriceItem = {
  passId: string;
  quantity: number;
  actualUnitPrice: number;
  checkoutUnitPrice?: number;
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export default function NuscPriceBreakdown({
  items,
  totalPayable,
  compact = false,
}: {
  items: NuscPriceItem[];
  totalPayable?: number;
  compact?: boolean;
}) {
  const lines = items.filter((item) => item.quantity > 0 && PASS_NAMES[item.passId]);
  if (lines.length === 0) return null;

  const isPremiumSeason = lines.length === 1 && lines[0].passId === "premium-season";
  const basePrice = lines.reduce((total, item) => total + item.actualUnitPrice * item.quantity, 0);
  const sportsDevelopmentFund = roundRupees(basePrice * 0.1);
  const convenienceFee = roundRupees(basePrice * 0.1);

  return (
    <section
      aria-label="NUSC price breakdown"
      className={compact ? "mt-0 border-t border-gray-200 pt-4" : "mt-6 border-t border-gray-200 pt-5"}
    >
      <h3 className="text-sm font-semibold text-gray-900">Price breakdown</h3>
      <div className="mt-3 space-y-2 text-sm text-gray-600">
        <div className="flex justify-between gap-3">
          <span>{isPremiumSeason ? "Base price" : "Base ticket price"}</span>
          <span>{formatRupees(basePrice)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>{isPremiumSeason ? "SDF" : "Sports Development Fund (10%)"}</span>
          <span>{formatRupees(sportsDevelopmentFund)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>{isPremiumSeason ? "Convenience fee" : "Convenience fee (10%)"}</span>
          <span>{formatRupees(convenienceFee)}</span>
        </div>
      </div>
      {typeof totalPayable === "number" && (
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-gray-200 pt-4 text-gray-900">
          <div>
            <p className="font-semibold">{isPremiumSeason ? "Total" : "Total payable"}</p>
            <p className="mt-1 text-xs text-gray-500">Includes all applicable fees</p>
          </div>
          <p className="text-lg font-bold">{formatRupees(totalPayable)}</p>
        </div>
      )}
    </section>
  );
}
