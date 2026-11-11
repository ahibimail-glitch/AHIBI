export const NUSC_HOME_MATCHES = [
  { date: "2026-11-14", label: "14 November 2026", day: "Saturday", time: "6:30 PM", opponent: "Gokulam Kerala FC" },
  { date: "2026-11-30", label: "30 November 2026", day: "Monday", time: "6:30 PM", opponent: "Dempo SC" },
  { date: "2026-12-15", label: "15 December 2026", day: "Tuesday", time: "6:30 PM", opponent: "Sreenidi Deccan FC" },
  { date: "2026-12-19", label: "19 December 2026", day: "Saturday", time: "6:30 PM", opponent: "Mohammedan SC" },
  { date: "2027-01-04", label: "4 January 2027", day: "Monday", time: "6:30 PM", opponent: "Rajasthan United FC" },
  { date: "2027-01-09", label: "9 January 2027", day: "Saturday", time: "6:30 PM", opponent: "FC Bengaluru United" },
  { date: "2027-01-16", label: "16 January 2027", day: "Saturday", time: "6:30 PM", opponent: "Shillong Lajong FC" },
  { date: "2026-12-07", label: "7 December 2026", day: "Monday", time: "6:30 PM", opponent: "Chanmari FC" },
  { date: "2027-03-13", label: "13 March 2027", day: "Saturday", time: "6:30 PM", opponent: "Samaleswari SC" },
  { date: "2027-03-20", label: "20 March 2027", day: "Saturday", time: "6:30 PM", opponent: "Real Kashmir FC" },
] as const;

const NUSC_MATCH_DATE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  // Keep existing checkout return URLs valid after the Chanmari reschedule.
  "2027-02-06": "2026-12-07",
});

export function normalizeNuscMatchDate(date: string) {
  return NUSC_MATCH_DATE_ALIASES[date] || date;
}

export function isNuscMatchDate(date: string) {
  const normalizedDate = normalizeNuscMatchDate(date);
  return NUSC_HOME_MATCHES.some((match) => match.date === normalizedDate);
}

export function filterNuscMatchDates(dates: string[]) {
  return dates.filter(isNuscMatchDate);
}

export function normalizeNuscMatchDates(dates: string[]) {
  return [...new Set(filterNuscMatchDates(dates).map(normalizeNuscMatchDate))];
}

// Preserve the original fixture order for stable season-pass ticket indexes.
export const NUSC_HOME_MATCHES_CHRONOLOGICAL = [...NUSC_HOME_MATCHES].sort(
  (first, second) => first.date.localeCompare(second.date),
);

export const NUSC_MATCH_EVENT_SLUG_PREFIX = "nusc-home-match-";

export function getNuscMatchSlug(date: string) {
  return `${NUSC_MATCH_EVENT_SLUG_PREFIX}${normalizeNuscMatchDate(date).replace(/-/g, "")}`;
}

export function getNuscMatchDateFromSlug(slug?: string) {
  const match = /^nusc-home-match-(\d{4})(\d{2})(\d{2})$/.exec(slug || "");
  const date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  return date ? normalizeNuscMatchDate(date) : null;
}

export function getNuscMatchPassSelectionUrl(
  matchDates: string | readonly string[],
  passId = "general-single",
  progress?: { completedCount?: string | null; completedDate?: string | null }
) {
  const params = new URLSearchParams({
    continueDates: normalizeNuscMatchDates(
      typeof matchDates === "string" ? matchDates.split(",") : [...matchDates],
    ).join(","),
    nuscPass: passId,
  });
  if (progress?.completedCount) params.set("nuscCompletedCount", progress.completedCount);
  if (progress?.completedDate) params.set("nuscCompletedDate", normalizeNuscMatchDate(progress.completedDate));
  return `/nusc-home-matches?${params.toString()}#passes`;
}

function nuscCheckoutStorageKey(scope: string) {
  return `ahibi:nusc-checkout:v1:${encodeURIComponent(scope)}`;
}

export function getNuscCheckoutRequestId(scope: string) {
  if (typeof window === "undefined") throw new Error("Checkout is unavailable in this browser context.");

  try {
    const storageKey = nuscCheckoutStorageKey(scope);
    const existing = window.localStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9_-]{16,80}$/.test(existing)) return existing;

    const values = new Uint8Array(16);
    window.crypto.getRandomValues(values);
    values[6] = (values[6] & 0x0f) | 0x40;
    values[8] = (values[8] & 0x3f) | 0x80;
    const hex = [...values].map((value) => value.toString(16).padStart(2, "0"));
    const requestId = `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
    window.localStorage.setItem(storageKey, requestId);
    return requestId;
  } catch {
    throw new Error("Your browser could not save checkout safely. Enable browser storage and try again.");
  }
}

export function clearNuscCheckoutRequestId(scope: string, requestId: string) {
  if (typeof window === "undefined") return;
  try {
    const storageKey = nuscCheckoutStorageKey(scope);
    if (window.localStorage.getItem(storageKey) === requestId) {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // The completed order is already confirmed; a stale key is safe to reuse only as an idempotent retry.
  }
}

export function getNextNuscMatchDate(now = Date.now()) {
  return getNextNuscMatch(now).date;
}

export function getNextNuscMatch(now = Date.now()) {
  return (
    NUSC_HOME_MATCHES_CHRONOLOGICAL.find(
      (match) => new Date(`${match.date}T23:59:59+05:30`).getTime() >= now
    ) || NUSC_HOME_MATCHES_CHRONOLOGICAL[NUSC_HOME_MATCHES_CHRONOLOGICAL.length - 1]
  );
}
