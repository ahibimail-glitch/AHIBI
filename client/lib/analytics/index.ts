import { GA_MEASUREMENT_ID, gtag, isGtagReady } from "./gtag";

export { GA_MEASUREMENT_ID, gtag, isGtagReady };

export type AnalyticsEventParams = Record<
  string,
  string | number | boolean | undefined
>;

export interface TrackEventParams {
  eventName: string;
  params?: AnalyticsEventParams;
}

/** Send any custom GA4 event. */
export function trackEvent({ eventName, params }: TrackEventParams): void {
  gtag("event", eventName, params);
}

export interface TrackPageViewOptions {
  /** Path including query string, e.g. `/events/123?tab=info` */
  pagePath?: string;
  pageTitle?: string;
}

/** Send a manual page_view (used by the route-change listener). */
export function trackPageView(options: TrackPageViewOptions = {}): void {
  if (typeof window === "undefined") return;

  const pagePath =
    options.pagePath ??
    `${window.location.pathname}${window.location.search}`;
  const pageLocation = `${window.location.origin}${pagePath}`;
  const pageTitle = options.pageTitle ?? document.title;

  gtag("event", "page_view", {
    page_path: pagePath,
    page_location: pageLocation,
    page_title: pageTitle,
  });
}

export interface PurchaseItem {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
}

export interface TrackPurchaseParams {
  transaction_id: string;
  value: number;
  currency?: string;
  items?: PurchaseItem[];
}

/** Standard GA4 purchase conversion. */
export function trackPurchase({
  transaction_id,
  value,
  currency = "INR",
  items,
}: TrackPurchaseParams): void {
  gtag("event", "purchase", {
    transaction_id,
    value,
    currency,
    items,
  });
}

// ─── Ahibi-specific events ───────────────────────────────────────────────────

export interface EventViewParams {
  event_id: string;
  event_name: string;
}

export function trackEventView(params: EventViewParams): void {
  trackEvent({ eventName: "event_view", params: { ...params } });
}

export interface BookingStartedParams {
  event_id: string;
  event_name: string;
}

export function trackBookingStarted(params: BookingStartedParams): void {
  trackEvent({ eventName: "booking_started", params: { ...params } });
}

export interface CheckoutStartedParams {
  event_id: string;
  event_name: string;
  amount: number;
}

export function trackCheckoutStarted(params: CheckoutStartedParams): void {
  trackEvent({ eventName: "checkout_started", params: { ...params } });
}

export interface PaymentSuccessParams {
  event_id: string;
  event_name: string;
  amount: number;
  currency?: string;
}

export function trackPaymentSuccess(params: PaymentSuccessParams): void {
  const { currency = "INR", ...rest } = params;
  trackEvent({ eventName: "payment_success", params: { ...rest, currency } });
}

export interface PaymentFailedParams {
  event_id: string;
  event_name: string;
}

export function trackPaymentFailed(params: PaymentFailedParams): void {
  trackEvent({ eventName: "payment_failed", params: { ...params } });
}

export interface TicketGeneratedParams {
  event_id: string;
  event_name: string;
  ticket_count: number;
}

export function trackTicketGenerated(params: TicketGeneratedParams): void {
  trackEvent({ eventName: "ticket_generated", params: { ...params } });
}
