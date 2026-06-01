import { GA_MEASUREMENT_ID } from "@/lib/analytics/constants";

type AnalyticsParams = Gtag.EventParams;

export type AhibiEventPayload = {
  event_id: string;
  event_name: string;
};

export type CheckoutEventPayload = AhibiEventPayload & {
  amount: number;
};

export type PaymentSuccessPayload = CheckoutEventPayload & {
  currency: string;
};

export type TicketGeneratedPayload = AhibiEventPayload & {
  ticket_count: number;
};

export type PurchaseItem = {
  item_id: string;
  item_name: string;
  quantity?: number;
  price?: number;
};

export type PurchasePayload = {
  transaction_id: string;
  value: number;
  currency: string;
  items?: PurchaseItem[];
};

const isBrowser = () => typeof window !== "undefined";

export const trackEvent = (eventName: string, params: AnalyticsParams = {}) => {
  if (!isBrowser() || typeof window.gtag !== "function") return;

  window.gtag("event", eventName, params);
};

export const trackPageView = (url: string) => {
  if (!isBrowser() || typeof window.gtag !== "function") return;

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

export const trackPurchase = ({
  transaction_id,
  value,
  currency,
  items,
}: PurchasePayload) => {
  trackEvent("purchase", {
    transaction_id,
    value,
    currency,
    items,
  });
};

export const trackEventView = (payload: AhibiEventPayload) => {
  trackEvent("event_view", payload);
};

export const trackBookingStarted = (payload: AhibiEventPayload) => {
  trackEvent("booking_started", payload);
};

export const trackCheckoutStarted = (payload: CheckoutEventPayload) => {
  trackEvent("checkout_started", payload);
};

export const trackPaymentSuccess = (payload: PaymentSuccessPayload) => {
  trackEvent("payment_success", payload);
};

export const trackPaymentFailed = (payload: AhibiEventPayload) => {
  trackEvent("payment_failed", payload);
};

export const trackTicketGenerated = (payload: TicketGeneratedPayload) => {
  trackEvent("ticket_generated", payload);
};
