export {};

declare global {
  namespace Gtag {
    interface Gtag {
      (command: "js", targetId: Date): void;
      (
        command: "config",
        targetId: string,
        config?: ControlParams & EventParams & ConfigParams
      ): void;
      (
        command: "set",
        targetId: string,
        config: CustomParams | boolean | string
      ): void;
      (
        command: "event",
        eventName: string,
        eventParams?: ControlParams & EventParams & CustomParams
      ): void;
      (
        command: "consent",
        consentArg: "default" | "update",
        consentParams: ConsentParams
      ): void;
    }

    interface ConfigParams {
      page_path?: string;
      page_location?: string;
      page_title?: string;
      send_page_view?: boolean;
    }

    interface ControlParams {
      groups?: string | string[];
      send_to?: string | string[];
    }

    interface EventParams {
      currency?: string;
      value?: number;
      transaction_id?: string;
      items?: Item[];
      [key: string]: string | number | boolean | Item[] | undefined;
    }

    interface CustomParams {
      [key: string]: string | number | boolean | undefined;
    }

    interface Item {
      item_id?: string;
      item_name?: string;
      price?: number;
      quantity?: number;
    }

    interface ConsentParams {
      ad_storage?: "granted" | "denied";
      analytics_storage?: "granted" | "denied";
      [key: string]: string | undefined;
    }
  }

  interface Window {
    dataLayer: unknown[];
    gtag: Gtag.Gtag;
  }
}
