/** Razorpay checkout must use a sync handler or its modal stays open and the page feels frozen. */
export function runAfterRazorpay(handler: () => Promise<void>) {
  window.setTimeout(() => {
    void handler();
  }, 0);
}

export function setRazorpayCheckoutActive(active: boolean) {
  if (typeof document === "undefined") return;

  document.body.dataset.razorpayCheckout = active ? "open" : "closed";
  document.body.style.pointerEvents = active ? "" : "";
  document.body.style.overflow = active ? "" : "";

  document.querySelectorAll("[data-radix-dialog-overlay]").forEach((node) => {
    const el = node as HTMLElement;
    if (active) {
      el.dataset.prevPointerEvents = el.style.pointerEvents;
      el.style.pointerEvents = "none";
    } else if (el.dataset.prevPointerEvents !== undefined) {
      el.style.pointerEvents = el.dataset.prevPointerEvents;
      delete el.dataset.prevPointerEvents;
    }
  });
}

export async function downloadPdfFromUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to download invoice");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
