import { GA_MEASUREMENT_ID } from "./constants";

/** Returns true when gtag is available in the browser. */
export function isGtagReady(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/**
 * Low-level gtag wrapper — no-ops on the server or before scripts load.
 * Uses a variadic signature because gtag's overload set is not representable as Parameters<>.
 */
export function gtag(...args: [string, ...unknown[]]): void {
  if (!isGtagReady()) return;
  (window.gtag as (...a: unknown[]) => void)(...args);
}

export { GA_MEASUREMENT_ID };
