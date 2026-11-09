export type CapacityMetrics = {
  capacity?: unknown;
  maxCapacity?: unknown;
  sold?: unknown;
  held?: unknown;
  offlineReserved?: unknown;
  available?: unknown;
};

export function capacityCount(value: unknown): number | null {
  const count = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(count) && count >= 0 ? count : null;
}

export function formatCapacityMetric(value: unknown): string {
  const count = capacityCount(value);
  return count === null ? "—" : count.toLocaleString("en-IN");
}

export function committedCapacityCount(row: CapacityMetrics): number | null {
  const counts = [row.sold, row.held, row.offlineReserved].map(capacityCount);
  if (counts.some((count) => count === null)) return null;
  return (counts[0] ?? 0) + (counts[1] ?? 0) + (counts[2] ?? 0);
}

export function capacityRowIsEditable(row: CapacityMetrics): boolean {
  return capacityCount(row.capacity) !== null &&
    capacityCount(row.maxCapacity) !== null &&
    capacityCount(row.available) !== null &&
    committedCapacityCount(row) !== null;
}
