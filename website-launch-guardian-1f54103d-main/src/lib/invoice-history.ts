// Small local history of invoice previews/downloads per order.
// Stored in localStorage so it persists on the same device without a migration.

export type InvoiceEvent = {
  at: string; // ISO timestamp
  action: "preview" | "print";
  actor?: string | null; // email or name of admin/vendor who clicked
  panel?: "admin" | "vendor";
};

const KEY = (orderId: string) => `invoice_history:${orderId}`;
const MAX = 20;

export function getInvoiceHistory(orderId: string): InvoiceEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(orderId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function logInvoiceEvent(orderId: string, ev: Omit<InvoiceEvent, "at">) {
  if (typeof window === "undefined") return;
  try {
    const list = getInvoiceHistory(orderId);
    list.unshift({ at: new Date().toISOString(), ...ev });
    const trimmed = list.slice(0, MAX);
    window.localStorage.setItem(KEY(orderId), JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent("invoice-history:updated", { detail: { orderId } }));
  } catch {
    // ignore
  }
}

export function clearInvoiceHistory(orderId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY(orderId));
    window.dispatchEvent(new CustomEvent("invoice-history:updated", { detail: { orderId } }));
  } catch {
    // ignore
  }
}
